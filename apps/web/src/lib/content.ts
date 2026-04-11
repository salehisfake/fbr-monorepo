import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache } from 'react'
import { remark } from 'remark'
import html from 'remark-html'
import { serialize } from 'next-mdx-remote/serialize'
import type { MDXRemoteSerializeResult } from 'next-mdx-remote'
import type { Post, PostFrontmatter } from '../types'
import { fileURLToPath } from 'url'

export interface PostData {
  slug:        string
  title:       string
  description: string
  pubDate:     string
  tags:        string[]
  contentHtml: string
  mdxSource:   MDXRemoteSerializeResult
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONTENT_DIR = path.join(__dirname, '../content/posts')

function resolvePostFilePath(slug: string): string {
  const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (fs.existsSync(mdxPath)) return mdxPath
  const mdPath = path.join(CONTENT_DIR, `${slug}.md`)
  if (fs.existsSync(mdPath)) return mdPath
  throw new Error(`Post "${slug}" not found`)
}

export function getAllSlugs(): string[] {
  const files = fs.readdirSync(CONTENT_DIR)
  return files
    .filter(file => file.endsWith('.md') || file.endsWith('.mdx'))
    .map(file => file.replace(/\.mdx?$/, ''))
}

export async function getPost(slug: string): Promise<Post> {
  const filePath = resolvePostFilePath(slug)
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)

  if (!data.title || !data.description || !data.tags || !data.pubDate) {
    throw new Error(`Post "${slug}" is missing required frontmatter fields`)
  }

  const frontmatter: PostFrontmatter = {
    title: data.title,
    description: data.description,
    tags: data.tags,
    pubDate: data.pubDate,
    connections: data.connections ?? []
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

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html).process(markdown)
  return result.toString()
}

export async function markdownToMdxSource(markdown: string): Promise<MDXRemoteSerializeResult> {
  return serialize(markdown)
}

/**
 * Single entry point for server-side post rendering.
 * Wrapped in React's cache() so multiple callers in the same RSC request
 * (e.g. generateMetadata + page body) only hit the filesystem once.
 */
export const getRenderedPost = cache(async (slug: string): Promise<PostData> => {
  const post = await getPost(slug)
  const contentHtml = await markdownToHtml(post.content)
  const mdxSource = await markdownToMdxSource(post.content)
  return {
    slug,
    title:       post.frontmatter.title,
    description: post.frontmatter.description,
    pubDate:     post.frontmatter.pubDate,
    tags:        post.frontmatter.tags,
    contentHtml,
    mdxSource,
  }
})

/**
 * Sync frontmatter back to .md files on disk.
 * Currently a no-op — all posts carry complete frontmatter.
 * Extend this function to write back derived fields (e.g. auto-generated
 * pubDate, resolved connections) when that workflow is needed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncFrontmatter(_posts: Post[]): Promise<void> {
  // no-op
}