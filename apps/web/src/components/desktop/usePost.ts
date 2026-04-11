// apps/web/src/components/desktop/usePost.ts
'use client'

import { useEffect, useState } from 'react'
import type { PostData } from '@/lib/content'
import { usePostCache } from './PostCacheContext'

interface UsePostResult {
  post:      PostData | null
  isLoading: boolean
  isVisible: boolean
  error:     string | null
}

export function usePost(slug: string, swapDelay = 120): UsePostResult {
  const cache       = usePostCache()
  const cached      = cache.get(slug) ?? null

  const [post,    setPost]    = useState<PostData | null>(cached)
  const [loading, setLoading] = useState(cached === null)
  const [visible, setVisible] = useState(cached !== null)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    // Cache hit for this exact slug — nothing to fetch.
    if (post?.slug === slug) {
      setVisible(true)
      setLoading(false)
      return
    }

    const hasExistingPost = post !== null
    if (!hasExistingPost) setLoading(true)
    setError(null)

    let cancelled = false

    fetch(`/api/posts/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Post not found')
        return r.json() as Promise<PostData>
      })
      .then(data => {
        if (cancelled) return
        if (!hasExistingPost) {
          setPost(data)
          setLoading(false)
          requestAnimationFrame(() => { if (!cancelled) setVisible(true) })
        } else {
          // Slug swap: fade out current, then swap content and fade in.
          setVisible(false)
          setTimeout(() => {
            if (cancelled) return
            setPost(data)
            requestAnimationFrame(() => { if (!cancelled) setVisible(true) })
          }, swapDelay)
        }
      })
      .catch(e => {
        if (cancelled) return
        setError((e as Error).message)
        if (!hasExistingPost) setLoading(false)
      })

    return () => { cancelled = true }
  // post is intentionally excluded: one fetch cycle per slug change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return { post, isLoading: loading, isVisible: visible, error }
}
