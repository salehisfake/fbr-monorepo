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
  const [contentVisible, setContentVisible] = useState(false)

  useEffect(() => {
    const hasExistingPost = post !== null
    if (!hasExistingPost) {
      setLoading(true)
    }
    setError(null)
    let cancelled = false
    let swapTimer: ReturnType<typeof setTimeout> | null = null

    fetch(`/api/posts/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Post not found')
        return r.json()
      })
      .then((data: PostData) => {
        if (cancelled) return
        if (!hasExistingPost) {
          // First load: just render and fade in.
          setPost(data)
          setLoading(false)
          requestAnimationFrame(() => {
            if (!cancelled) setContentVisible(true)
          })
          return
        }

        // Slug switch with existing content:
        // keep current post on screen until the next post is ready, then swap.
        setContentVisible(false)
        swapTimer = setTimeout(() => {
          if (cancelled) return
          setPost(data)
          requestAnimationFrame(() => {
            if (!cancelled) setContentVisible(true)
          })
        }, 120)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
        if (!hasExistingPost) setLoading(false)
      })

    return () => {
      cancelled = true
      if (swapTimer) clearTimeout(swapTimer)
    }
  // We intentionally don't include `post` so each slug change runs one fetch cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (loading && !post) {
    return <div className={styles.stateMessage}>Loading...</div>
  }

  if ((error && !post) || !post) {
    return <div className={styles.stateMessage}>Could not load post.</div>
  }

  return (
    <div className={styles.root}>
      <div className={`${styles.inner} ${contentVisible ? styles.contentVisible : styles.contentHidden}`}>
        <p className={styles.title}>{post.title}</p>
        <p className={styles.meta}>
          {new Date(post.pubDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
          {post.tags.length > 0 && ` · ${post.tags.join(', ')}`}
        </p>

        <div
          className={styles.postContent}
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </div>
    </div>
  )
}
