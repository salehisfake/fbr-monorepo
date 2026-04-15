'use client'

import TagIndexView from './TagIndexView'
import type { AppState } from './useLayoutStore'

export default function TagApp({ tagSlug }: AppState['tag']) {
  return <TagIndexView tagSlug={tagSlug} />
}
