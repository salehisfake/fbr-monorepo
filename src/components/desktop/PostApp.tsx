// apps/web/src/components/desktop/PostApp.tsx
'use client'

import PostContent from './PostContent'
import type { AppState } from './useLayoutStore'

export default function PostApp({ slug }: AppState['post']) {
  return <PostContent slug={slug} />
}
