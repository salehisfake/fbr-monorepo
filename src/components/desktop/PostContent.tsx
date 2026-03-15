// apps/web/src/components/desktop/PostContent.tsx
'use client'

import { useEffect, useState } from 'react'
import styles from './PostContent.module.css'

interface PostContentProps {
  slug: string
}

interface PostData {
  title:       string
  description: string
  pubDate:     string
  tags:        string[]
  contentHtml: string
}

export default function PostContent({ slug }: PostContentProps) {
  const [post,    setPost]    = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/posts/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Post not found')
        return r.json()
      })
      .then(setPost)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div style={{ padding: '24px', color: '#888', fontFamily: 'var(--font-mplus)' }}>
      Loading...
    </div>
  )

  if (error || !post) return (
    <div style={{ padding: '24px', color: '#888', fontFamily: 'var(--font-mplus)' }}>
      Could not load post.
    </div>
  )

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <p style={{
        fontSize: '48px',
        color: '#3d3d3d',
        margin: '0 0 24px 0',
        fontFamily: 'var(--font-mplus)',
        fontWeight: '700',
        letterSpacing: '-0.02em',
      }}>
        {post.title}
      </p>
      <p style={{
        fontSize: '11px',
        color: '#888',
        margin: '0 0 24px 0',
        fontFamily: 'var(--font-mplus)',
        letterSpacing: '0.05em',
      }}>
        {new Date(post.pubDate).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric'
        })}
        {post.tags.length > 0 && ` · ${post.tags.join(', ')}`}
      </p>

      <div
        className={styles.postContent}
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </div>
  )
}