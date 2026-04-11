'use client'

import GlassSurface from '@/components/GlassSurface'
import { useLayoutStore, getLeaves } from './useLayoutStore'
import { COLORS, Z, DURATION } from '@/lib/tokens'

/**
 * Dot indicator shown on mobile.
 * Dot 0 = graph, dots 1..N = each open window (leaf).
 * Active dot expands into a pill; tapping navigates to that page.
 */
export default function CarouselDots() {
  const root                = useLayoutStore((s) => s.root)
  const mobileActivePage    = useLayoutStore((s) => s.mobileActivePage)
  const setMobileActivePage = useLayoutStore((s) => s.setMobileActivePage)
  const focusWindow         = useLayoutStore((s) => s.focusWindow)

  const leaves    = getLeaves(root)
  const totalDots = 1 + leaves.length

  const handleDotClick = (pageIndex: number) => {
    setMobileActivePage(pageIndex)
    if (pageIndex > 0) {
      const leaf = leaves[pageIndex - 1]
      if (leaf) focusWindow(leaf.id)
    }
  }

  return (
    <GlassSurface
      glass='DOTS'
      role='tablist'
      aria-label='Switch view'
      style={{
        position:  'fixed',
        bottom:    '24px',
        left:      '50%',
        transform: 'translateX(-50%)',
        display:   'flex',
        alignItems: 'center',
        gap:       '10px',
        zIndex:    Z.CAROUSEL,
        padding:   '12px 18px',
      }}
    >
      {Array.from({ length: totalDots }, (_, i) => {
        const isActive = mobileActivePage === i
        return (
          <button
            key={i}
            role='tab'
            aria-selected={isActive}
            aria-label={i === 0 ? 'Graph view' : `Window ${i}`}
            onClick={() => handleDotClick(i)}
            style={{
              width:        isActive ? '28px' : '10px',
              height:       '10px',
              borderRadius: 0,
              background:   isActive ? COLORS.BLACK : 'rgba(63,63,70,0.15)',
              border:       isActive ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${COLORS.LIGHT}`,
              boxShadow:    isActive ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
              transition:   `width ${DURATION.FAST} ease`,
              cursor:       'pointer',
              padding:      0,
              flexShrink:   0,
            }}
          />
        )
      })}
    </GlassSurface>
  )
}
