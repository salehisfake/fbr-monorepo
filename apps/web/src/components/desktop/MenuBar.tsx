'use client'

import { useEffect, useRef, useState } from 'react'
import { COLORS } from '@/components/graph/graphConstants'
import GlassSurface from '@/components/GlassSurface'
import FBRLogo from '@/components/FBRLogo'
import { Z, LAYOUT } from '@/lib/tokens'

const BAR_HEIGHT = LAYOUT.MENUBAR_HEIGHT

function formatDateTime(value: Date): string {
  const yyyy = value.getFullYear()
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const dd = String(value.getDate()).padStart(2, '0')
  const hh = String(value.getHours()).padStart(2, '0')
  const min = String(value.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export default function MenuBar() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [nowLabel, setNowLabel] = useState(() => formatDateTime(new Date()))

  useEffect(() => {
    const tick = () => setNowLabel(formatDateTime(new Date()))
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <GlassSurface
      ref={rootRef}
      glass='MENUBAR'
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: BAR_HEIGHT,
        zIndex: Z.MENUBAR,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px', marginRight: 10 }}>
        <FBRLogo color={COLORS.BLACK} />
        <span
          style={{
            fontFamily: 'var(--font-mplus), sans-serif',
            fontSize: 11,
            fontWeight: 500,
            color: COLORS.BLACK,
          }}
        >
          FBR dex
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-mplus), sans-serif',
          fontSize: 11,
          color: COLORS.MID,
          letterSpacing: '0.02em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {nowLabel}
      </div>
    </GlassSurface>
  )
}

