// apps/web/src/app/(content)/posts/[slug]/page.tsx

import { getAllSlugs, getPost, markdownToHtml } from '@/lib/content'
import type { Metadata } from 'next'

interface PostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = getAllSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata(
  { params }: PostPageProps
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      type: 'article',
      publishedTime: post.frontmatter.pubDate,
    },
    alternates: {
      canonical: `/posts/${post.slug}`
    }
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPost(slug)
  const contentHtml = await markdownToHtml(post.content)

  return (
    <article>
      <header>
        <h1>{post.frontmatter.title}</h1>
        <p>{post.frontmatter.description}</p>
        <time dateTime={post.frontmatter.pubDate}>
          {new Date(post.frontmatter.pubDate).toLocaleDateString()}
        </time>
        <ul>
          {post.frontmatter.tags.map(tag => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </header>
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </article>
  )
}