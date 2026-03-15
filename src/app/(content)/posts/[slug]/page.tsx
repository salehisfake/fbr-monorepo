// apps/web/src/app/(content)/posts/[slug]/page.tsx
import Desktop from '@/components/desktop/Desktop'
import { getPost } from '@/lib/content'
import { markdownToHtml } from '@/lib/content'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  return {
    title:       post.frontmatter.title,
    description: post.frontmatter.description,
    openGraph: {
      title:       post.frontmatter.title,
      description: post.frontmatter.description,
      type:        'article',
      publishedTime: post.frontmatter.pubDate,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  const contentHtml = await markdownToHtml(post.content)

  return (
    <>
      {/* Crawler-readable content — invisible to users, fully indexed by search engines */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        <h1>{post.frontmatter.title}</h1>
        <p>{post.frontmatter.description}</p>
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </div>

      {/* Desktop for users */}
      <Desktop initialSlug={slug} />
    </>
  )
}