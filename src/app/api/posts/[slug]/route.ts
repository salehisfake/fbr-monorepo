// apps/web/src/app/api/posts/[slug]/route.ts

import { getPost } from '@/lib/content'
import { markdownToHtml } from '@/lib/content'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const post = await getPost(slug)
    const contentHtml = await markdownToHtml(post.content)

    return NextResponse.json({
      title:       post.frontmatter.title,
      description: post.frontmatter.description,
      pubDate:     post.frontmatter.pubDate,
      tags:        post.frontmatter.tags,
      contentHtml,
    })
  } catch {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
}