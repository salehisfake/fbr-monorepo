// apps/web/src/components/desktop/Window.tsx
'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { LeafNode } from './useLayoutStore'
import { useLayoutStore } from './useLayoutStore'
import AppHost from './AppHost'
import { COLORS } from '@/components/graph/graphConstants'

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

/** Subtle directional fibers (anisotropic feel, no color tint). */
const NOISE_FIBER = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="56">
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.85" numOctaves="1" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.24"/>
  </svg>`,
)}")`

export interface WindowProps {
  node:           LeafNode
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
  const [isCloseHovered, setIsCloseHovered] = useState(false)
  const [closeTooltipPos, setCloseTooltipPos] = useState({ x: 0, y: 0 })

  const borderColor = !effectiveVisible
    ? 'transparent'
    : isActive ?  'rgba(175, 175, 175, 0.29)' : COLORS.LIGHT

  // When zoom hides the panel, strip glass + blur — otherwise the frosted rect
  // stays on screen even though content opacity is 0.
  const glassOn = effectiveVisible

  return (
    <div
      onClick={onFocus}
      style={{
        position:             'relative',
        width:                '100%',
        height:               '100%',
        background:           glassOn ? 'rgba(250, 250, 250, 0.85)' : 'transparent',
        backdropFilter:       glassOn ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: glassOn ? 'blur(8px)' : 'none',
        border:               `1px solid ${borderColor}`,
        overflow:             'hidden',
        boxSizing:            'border-box',
        borderRadius:         '3px',
      }}
    >
      {/* Paper-like texture stack on top of the glass — no warm tint */}
      <div
        aria-hidden
        style={{
          position:       'absolute',
          inset:          0,
          zIndex:         8,
          opacity:        glassOn ? 0.18 : 0,
          backgroundImage: NOISE_COARSE,
          backgroundRepeat: 'repeat',
          backgroundSize:   '144px 144px',
          mixBlendMode:     'multiply',
          pointerEvents:    'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position:       'absolute',
          inset:          0,
          zIndex:         9,
          opacity:        glassOn ? 0.2 : 0,
          backgroundImage: NOISE_FINE,
          backgroundRepeat: 'repeat',
          backgroundSize:   '64px 64px',
          mixBlendMode:     'multiply',
          pointerEvents:    'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position:       'absolute',
          inset:          0,
          zIndex:         9,
          opacity:        glassOn ? 0.08 : 0,
          backgroundImage: NOISE_FIBER,
          backgroundRepeat: 'repeat',
          backgroundSize:   '160px 56px',
          mixBlendMode:     'multiply',
          pointerEvents:    'none',
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        onMouseEnter={() => setIsCloseHovered(true)}
        onMouseMove={(e) => setCloseTooltipPos({ x: e.clientX + 10, y: e.clientY + 12 })}
        onMouseLeave={() => setIsCloseHovered(false)}
        style={{
          position:       'absolute',
          top:            '16px',
          left:           '16px',
          zIndex:         10,
          width:          '12px',
          height:         '12px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     'transparent',
          border:         'none',
          cursor:         'pointer',
          fontSize:       '14px',
          color:          !effectiveVisible ? 'transparent' : COLORS.MID,
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
          width="8"
          height="8"
          viewBox="0 0 8 8"
          aria-hidden="true"
          style={{
            display: 'block',
            transform: `scale(${iconScale})`,
            transformOrigin: 'center',
            transition: 'transform 45ms linear',
            willChange: 'transform',
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
          <rect x="0" y="0" width="8" height="8" fill={!effectiveVisible ? 'transparent' : COLORS.MID} />
          <rect
            x="0"
            y="0"
            width="8"
            height="8"
            fill="#ffffff"
            filter="url(#close-noise)"
            opacity={effectiveVisible ? 0.13 : 0}
            style={{ mixBlendMode: 'multiply' }}
          />
        </svg>
          )
        })()}
      </button>
      {isCloseHovered && effectiveVisible && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: closeTooltipPos.x,
              top: closeTooltipPos.y,
              zIndex: 10050,
              pointerEvents: 'none',
              fontFamily: 'var(--font-mplus), sans-serif',
              fontSize: 11,
              color: COLORS.OFFWHITE,
              background: COLORS.BLACK,
              border: `1px solid ${COLORS.BLACK}`,
              padding: '2px 6px',
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
        style={{
          position:      'relative',
          zIndex:        2,
          width:         '100%',
          height:        '100%',
          opacity:       effectiveVisible ? 1 : 0,
          overflow:      'hidden',
          pointerEvents: effectiveVisible ? 'auto' : 'none',
        }}
      >
        <AppHost node={node} />
      </div>
    </div>
  )
}
