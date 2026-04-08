'use client'

import { useLayoutStore, getLeaves } from './useLayoutStore'
import { COLORS } from '@/components/graph/graphConstants'

/**
 * iOS-style dot indicator shown on mobile.
 * Dot 0 = graph, dots 1..N = each open window (leaf).
 * Tapping a dot navigates to that carousel page.
 */
export default function CarouselDots() {
  const root             = useLayoutStore((s) => s.root)
  const mobileActivePage = useLayoutStore((s) => s.mobileActivePage)
  const setMobileActivePage = useLayoutStore((s) => s.setMobileActivePage)
  const focusWindow      = useLayoutStore((s) => s.focusWindow)

  const leaves     = getLeaves(root)
  const totalDots  = 1 + leaves.length   // graph dot + one per window

  const handleDotClick = (pageIndex: number) => {
    setMobileActivePage(pageIndex)
    if (pageIndex > 0) {
      const leaf = leaves[pageIndex - 1]
      if (leaf) focusWindow(leaf.id)
    }
  }

  return (
    <div
      style={{
        position:       'fixed',
        bottom:         '24px',
        left:           '50%',
        transform:      'translateX(-50%)',
        display:        'flex',
        alignItems:     'center',
        gap:            '8px',
        zIndex:         9999,
        padding:        '6px 10px',
        borderRadius:   '20px',
        background:     'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        border:         `1px solid ${COLORS.LIGHT}`,
      }}
      role="tablist"
      aria-label="Switch view"
    >
      {Array.from({ length: totalDots }, (_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={mobileActivePage === i}
          aria-label={i === 0 ? 'Graph view' : `Window ${i}`}
          onClick={() => handleDotClick(i)}
          style={{
            width:        '7px',
            height:       '7px',
            borderRadius: '50%',
            background:   mobileActivePage === i ? COLORS.BLACK : 'transparent',
            border:       `1.5px solid ${COLORS.BLACK}`,
            cursor:       'pointer',
            padding:      0,
            flexShrink:   0,
          }}
        />
      ))}
    </div>
  )
}
