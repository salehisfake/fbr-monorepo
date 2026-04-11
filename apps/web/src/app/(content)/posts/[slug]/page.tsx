// apps/web/src/app/(content)/posts/[slug]/page.tsx
import Desktop from '@/components/desktop/Desktop'
import { PostCacheProvider } from '@/components/desktop/PostCacheContext'
import { getRenderedPost } from '@/lib/content'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getRenderedPost(slug)
  return {
    title:       post.title,
    description: post.description,
    openGraph: {
      title:       post.title,
      description: post.description,
      type:        'article',
      publishedTime: post.pubDate,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getRenderedPost(slug)

  return (
    <>
      {/* Crawler-readable content — invisible to users, fully indexed by search engines */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        <h1>{post.title}</h1>
        <p>{post.description}</p>
        <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </div>

      {/* PostCacheProvider seeds the client with SSR data so PostContent skips its first fetch */}
      <PostCacheProvider initial={post}>
        <Desktop initialSlug={slug} />
      </PostCacheProvider>
    </>
  )
}