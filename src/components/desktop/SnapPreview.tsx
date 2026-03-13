// apps/web/src/components/desktop/SnapPreview.tsx
'use client'

import { SNAP_PREVIEW_STYLES, type SnapZone } from './snapUtils'
import { COLORS } from '@/components/graph/graphConstants'

interface SnapPreviewProps {
  zone: SnapZone
}

export default function SnapPreview({ zone }: SnapPreviewProps) {
  if (!zone) return null

  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      pointerEvents:   'none',
      zIndex:          9998,
    }}>
      <div style={{
        position:        'absolute',
        background:      'rgba(26, 26, 26, 0.03)',
        border:          `1px solid ${COLORS.LIGHT}`,
        transition:      'all 200ms ease',
        boxSizing:       'border-box',
        ...SNAP_PREVIEW_STYLES[zone],
      }} />
    </div>
  )
}