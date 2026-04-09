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
export function getAllSlugs(): string[] {
  const files = fs.readdirSync(CONTENT_DIR)
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/, ''))
}

export async function getPost(slug: string): Promise<Post> {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`)
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