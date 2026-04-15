import { slugifyTag } from './tagSlug'

/**
 * Canonical tag label for UI: lowercase `#` + slug token (matches graph tag ids).
 * Strips leading `#` from source so we never show `##tag`.
 */
export function formatTagDisplay(raw: string): string {
  const s = slugifyTag(raw.replace(/^#+/, ''))
  return s ? `#${s}` : ''
}
