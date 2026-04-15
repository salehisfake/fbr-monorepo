import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/content'

/** Minimal post rows for tag index / client-side filtering. */
export async function GET() {
  const posts = await getAllPosts()
  const entries = posts.map((p) => ({
    slug:        p.slug,
    title:       p.frontmatter.title,
    description: p.frontmatter.description,
    pubDate:     p.frontmatter.pubDate,
    tags:        p.frontmatter.tags,
  }))
  return NextResponse.json(entries)
}
