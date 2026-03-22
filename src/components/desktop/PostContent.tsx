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
      <div className={styles.metadata}>
        {post.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            {post.tags.map((tag) => (
              <button key={tag} className={styles.tag}>
                {tag}
              </button>
            ))}
          </div>
        )}
        <p className={styles.date}>
          {new Date(post.pubDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      <div
        className={styles.postContent}
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </div>
  )
}