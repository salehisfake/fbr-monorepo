// apps/web/src/components/desktop/PostCacheContext.tsx
'use client'

import { createContext, useContext, useMemo } from 'react'
import type { PostData } from '@/lib/content'

const PostCacheContext = createContext<ReadonlyMap<string, PostData>>(new Map())

export function PostCacheProvider({
  initial,
  children,
}: {
  initial: PostData
  children: React.ReactNode
}) {
  const cache = useMemo(() => new Map([[initial.slug, initial]]), [])
  return (
    <PostCacheContext.Provider value={cache}>
      {children}
    </PostCacheContext.Provider>
  )
}

export function usePostCache(): ReadonlyMap<string, PostData> {
  return useContext(PostCacheContext)
}
