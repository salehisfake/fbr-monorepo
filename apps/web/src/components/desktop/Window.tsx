// apps/web/src/components/desktop/Window.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { WindowItem } from './useLayoutStore'
import { useLayoutStore } from './useLayoutStore'
import AppHost from './AppHost'
import GlassSurface from '@/components/GlassSurface'
import { COLORS, Z, DURATION } from '@/lib/tokens'
import styles from './Window.module.css'

/** Fine paper grain (small-scale texture). */
const NOISE_FINE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.45"/>
  </svg>`,
)}")`

/** Coarse stock texture (broad paper tooth). */
const NOISE_COARSE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.32"/>
  </svg>`,
)}")`

export interface WindowProps {
  node:           WindowItem
  isActive:       boolean
  onClose:        () => void
  onFocus:        () => void
  /** Mobile: panel is always considered visible (no zoom gating). */
  alwaysVisible?: boolean
}

export default function Window({
  node,
  isActive,
  onClose,
  onFocus,
  alwaysVisible = false,
}: WindowProps) {
  const panelVisible     = useLayoutStore((s) => s.panelVisible)
  const effectiveVisible = alwaysVisible || panelVisible
  const glassOn          = effectiveVisible

  const [isCloseHovered, setIsCloseHovered]   = useState(false)
  const [closeTooltipPos, setCloseTooltipPos] = useState({ x: 0, y: 0 })

  // ── Exit animation ────────────────────────────────────────────────────────
  // Delay actual unmount so windowOut keyframe can play.
  // WINDOW_OUT duration (140ms) must stay in sync with tokens.ts WINDOW_OUT.

  const [isClosing, setIsClosing]     = useState(false)
  const closeTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation()
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => onClose(), 140)
  }

  return (
    <GlassSurface
      className={`${styles.windowRoot} ${isClosing ? styles.closing : styles.entering}`}
      active={glassOn}
      glass='WINDOW'
      glassFillAlphaScale={isActive ? 1 : 0.1}
      style={{
        width:         '100%',
        height:        '100%',
        overflow:      'hidden',
        boxSizing:     'border-box',
        outline:       `0px solid ${COLORS.ZINC_200}`,
        outlineOffset: -1,
      }}
      onClick={onFocus}
    >
      {/* Paper-like texture stack on top of the glass */}
      <div
        aria-hidden
        style={{
          position:         'absolute',
          inset:            0,
          zIndex:           Z.TEXTURE,
          opacity:          glassOn ? 0.18 : 0,
          backgroundImage:  NOISE_COARSE,
          backgroundRepeat: 'repeat',
          backgroundSize:   '144px 144px',
          mixBlendMode:     'multiply',
          pointerEvents:    'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position:         'absolute',
          inset:            0,
          zIndex:           Z.TEXTURE + 1,
          opacity:          glassOn ? 0.2 : 0,
          backgroundImage:  NOISE_FINE,
          backgroundRepeat: 'repeat',
          backgroundSize:   '64px 64px',
          mixBlendMode:     'multiply',
          pointerEvents:    'none',
        }}
      />

      <div className={styles.tabBar} style={{ zIndex: Z.CHROME }}>
        <button
          type="button"
          onClick={handleClose}
          onMouseEnter={() => setIsCloseHovered(true)}
          onMouseMove={(e) => setCloseTooltipPos({ x: e.clientX + 10, y: e.clientY + 12 })}
          onMouseLeave={() => setIsCloseHovered(false)}
          style={{
            width:          '14px',
            height:         '14px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'transparent',
            border:         'none',
            cursor:         'pointer',
            fontSize:       '14px',
            color:          !effectiveVisible ? 'transparent' : COLORS.ZINC_600,
            lineHeight:     1,
            padding:        0,
            fontFamily:     'var(--font-mplus), sans-serif',
            userSelect:     'none',
          }}
          aria-label="Close window"
        >
        {(() => {
          const iconScale = isCloseHovered ? 1 : 0.5
          return (
            <svg
              width="16"
              height="16"
              viewBox="0 0 10 10"
              aria-hidden="true"
              style={{
                display:            'block',
                transform:          `scale(${iconScale})`,
                transformOrigin:    'center',
                transition:         `transform ${DURATION.INSTANT} linear`,
                willChange:         'transform',
                backfaceVisibility: 'hidden',
              }}
            >
              <defs>
                <filter id="close-noise" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.62"
                    numOctaves="3"
                    stitchTiles="stitch"
                    result="noise"
                  />
                </filter>
              </defs>
              <rect x="0" y="0" width="10" height="10" fill={!effectiveVisible ? 'transparent' : COLORS.ZINC_600} />
              <rect
                x="0"
                y="0"
                width="10"
                height="10"
                fill={COLORS.WHITE}
                filter="url(#close-noise)"
                opacity={effectiveVisible ? 0.13 : 0}
                style={{ mixBlendMode: 'multiply' }}
              />
            </svg>
          )
        })()}
        </button>
      </div>

      {isCloseHovered && effectiveVisible && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position:   'fixed',
              left:       closeTooltipPos.x,
              top:        closeTooltipPos.y,
              zIndex:     Z.TOOLTIP,
              pointerEvents: 'none',
              fontFamily: 'var(--font-mplus), sans-serif',
              fontSize:   11,
              color:      COLORS.OFFWHITE,
              background: COLORS.BLACK,
              border:        `0px solid ${COLORS.ZINC_200}`,
              borderRadius:  '1px',
              padding:       '2px 6px',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
            aria-hidden="true"
          >
            close
          </div>,
          document.body,
        )}

      <div
        className={styles.body}
        style={{
          zIndex:        Z.CONTENT,
          opacity:       effectiveVisible ? 1 : 0,
          pointerEvents: effectiveVisible ? 'auto' : 'none',
        }}
      >
        <AppHost node={node} />
      </div>
    </GlassSurface>
  )
}
