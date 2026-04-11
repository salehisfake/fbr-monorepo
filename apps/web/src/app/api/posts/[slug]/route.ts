// apps/web/src/app/api/posts/[slug]/route.ts

import { getRenderedPost } from '@/lib/content'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const post = await getRenderedPost(slug)
    return NextResponse.json(post)
  } catch {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
}