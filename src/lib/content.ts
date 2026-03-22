// apps/web/src/lib/content.ts

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import type { Post, PostFrontmatter } from '../types'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONTENT_DIR = path.join(__dirname, '../content/posts')

// ── Private helpers ────────────────────────────────────────────────────────

/** Converts a slug like "my-cool-post" → "My Cool Post" */
function titleFromSlug(slug: string): string {
  return slug
    .replace(/^\d{8}[-\s]/, '')      // strip leading date + space or hyphen
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Strips markdown syntax and returns the first 1–2 sentences of body text.
 * Falls back to the first 160 characters if no sentence boundaries are found.
 */
function extractDescription(markdown: string): string {
  const plain = markdown
    .replace(/^#{1,6}\s+.+$/gm, '')       // headings
    .replace(/!\[.*?\]\(.*?\)/g, '')        // images
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')    // links → label text only
    .replace(/```[\s\S]*?```/g, '')         // fenced code blocks
    .replace(/`[^`]*`/g, '')               // inline code
    .replace(/[*_~]+/g, '')               // bold / italic / strikethrough markers
    .replace(/\n+/g, ' ')
    .trim()

  const sentences = plain.match(/[^.!?]+[.!?]+/g) ?? []
  return (
    sentences.slice(0, 2).join(' ').trim() ||
    plain.slice(0, 160).trim()
  )
}

/**
 * Extracts #hashtags from markdown body, skipping code blocks so things like
 * CSS colour values (#fff) or code comments don't produce phantom tags.
 */
function extractInlineHashtags(markdown: string): string[] {
  const clean = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')

  const tags: string[] = []
  for (const match of clean.matchAll(/#([A-Za-z][A-Za-z0-9_-]*)/g)) {
    tags.push(match[1])
  }
  return [...new Set(tags)]
}

/**
 * Extracts internal markdown links — [text](path) — normalised to slugs.
 * Ignores images (![...]) and any href that starts with http(s)://.
 */
function extractInternalLinks(markdown: string): string[] {
  const links: string[] = []

  for (const match of markdown.matchAll(/(?<!!)\[.+?\]\((?!https?:\/\/)([^)]+)\)/g)) {
    const target = match[1]
      .trim()
      .replace(/\.md$/, '')         // strip file extension
      .replace(/^\/posts\//, '')    // strip leading route prefix
      .toLowerCase()
      .replace(/\s+/g, '-')         // spaces → hyphens (rare but safe)

    if (target) links.push(target)
  }

  return [...new Set(links)]
}

// ── Public API ─────────────────────────────────────────────────────────────

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
}

/**
 * Loads a single post by slug.
 *
 * All frontmatter fields are optional — missing values are derived:
 *   • title       → slugified filename
 *   • description → first 1–2 sentences of body text
 *   • pubDate     → today's date (ISO)
 *   • tags        → [] (empty); inline #hashtags are always merged in
 *   • connections → [] (empty); inline [links] are always merged in
 */
export async function getPost(slug: string): Promise<Post> {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`)
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)

  // ── Derive missing scalar fields ──────────────────────────────────────
  const rawTitle = data.title ? String(data.title) : titleFromSlug(slug)
  // Strip date prefix whether it came from frontmatter or the slug
  const title = rawTitle.replace(/^\d{8}[-\s]/, '')
  const description = data.description ? String(data.description) : extractDescription(content)
  const pubDate     = data.pubDate     ? String(data.pubDate)     : new Date().toISOString().split('T')[0]

  // ── Tags: frontmatter + inline #hashtags (always merged) ─────────────
  const fmTags     = Array.isArray(data.tags) ? (data.tags as string[]) : []
  const inlineTags = extractInlineHashtags(content)
  const tags       = [...new Set([...fmTags, ...inlineTags])]

  // ── Connections: frontmatter + inline [markdown links] (always merged) ─
  const fmConnections     = Array.isArray(data.connections) ? (data.connections as string[]) : []
  const inlineConnections = extractInternalLinks(content)
  const connections       = [...new Set([...fmConnections, ...inlineConnections])]

  const frontmatter: PostFrontmatter = {
    title,
    description,
    tags,
    pubDate,
    connections,
  }

  return { slug, frontmatter, content }
}

export async function getAllPosts(): Promise<Post[]> {
  const slugs = getAllSlugs()
  const posts = await Promise.all(slugs.map(slug => getPost(slug)))
  return posts.sort((a, b) =>
    new Date(b.frontmatter.pubDate).getTime() -
    new Date(a.frontmatter.pubDate).getTime()
  )
}

/**
 * Writes derived / discovered fields back to each post's frontmatter on disk.
 *
 * Rules:
 *   • pubDate, title, description — only written when absent from file (never
 *     overwrite explicit author values).
 *   • connections — new entries are appended; existing entries are never
 *     removed or reordered (safe to run repeatedly).
 *
 * Call this from build-graph.ts before buildGraphData() so the graph and the
 * source files stay in sync without a separate maintenance script.
 */
export async function syncFrontmatter(posts: Post[]): Promise<void> {
  for (const post of posts) {
    const filePath = path.join(CONTENT_DIR, `${post.slug}.md`)
    const raw = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(raw)

    const patch: Record<string, unknown> = {}

    // Only backfill — never overwrite values the author set explicitly
    if (!data.pubDate)     patch.pubDate     = post.frontmatter.pubDate
    if (!data.title)       patch.title       = post.frontmatter.title
    if (!data.description) patch.description = post.frontmatter.description

    // Connections: append any newly discovered links, preserving existing order
    const onDisk  = Array.isArray(data.connections) ? (data.connections as string[]) : []
    const merged  = [...new Set([...onDisk, ...post.frontmatter.connections])]
    if (merged.length > onDisk.length) patch.connections = merged

    if (Object.keys(patch).length === 0) continue

    const updated = matter.stringify(content, { ...data, ...patch })
    fs.writeFileSync(filePath, updated, 'utf8')
    console.log(`  ↳ synced [${Object.keys(patch).join(', ')}] → ${post.slug}.md`)
  }
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html).process(markdown)
  return result.toString()
}