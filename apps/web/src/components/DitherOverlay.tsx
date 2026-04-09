'use client'

import type { CSSProperties } from 'react'

// Full-screen fixed overlay that applies a dither-like texture to the entire site.
//
// Each blend-mode layer MUST be a separate fixed sibling — NOT nested inside a
// shared container. A container with position:fixed + z-index creates a stacking
// context, which causes child mix-blend-mode elements to composite in isolation
// against transparent (white), not against the page content. Sibling divs each
// blend cumulatively against everything below them in z-order: page → layer1 →
// layer2 → layer3.
//
// Tuning knobs (CSS variables on <html>, adjustable from dev tools without rebuild):
//   --dither-scale   background-size of the pattern tile  (default: 8px)
//   --dither-gray    Layer 2 background color             (default: #d4d4d8 gray-300)
//   --dither-opacity Layer 3 opacity                      (default: 0.15)
//
// White-layer strategies are controlled by the `strategy` prop:
//   "low-opacity"  white + color-dodge at low opacity (default, softest)
//   "off-white"    #e4e4e7 (gray-200) + color-dodge   (slightly stronger)
//   "screen"       white + screen at low opacity      (no blowout risk)
//   "none"         Layer 3 omitted entirely           (darkest result)

export type DitherStrategy = 'low-opacity' | 'off-white' | 'screen' | 'none'

interface DitherOverlayProps {
  strategy?: DitherStrategy
  /**
   * Where to position the overlay.
   * - 'fixed': full-viewport overlay (global)
   * - 'absolute': fills the nearest positioned ancestor (scoped)
   */
  position?: 'fixed' | 'absolute'
  /** z-index used within the chosen positioning context */
  zIndex?: number
}

const LAYER_SHARED: CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
}

export default function DitherOverlay({
  strategy = 'low-opacity',
  position = 'fixed',
  zIndex = 3,
}: DitherOverlayProps) {
  const layerBase: CSSProperties = {
    ...LAYER_SHARED,
    position,
    zIndex,
  }

  return (
    <>
      {/* Layer 1: tiling Bayer-matrix pattern — per-pixel spatial threshold.
          Blends with actual page content directly below it. */}
      <div
        aria-hidden="true"
        style={{
          ...layerBase,
          backgroundImage: 'url(/dither-pattern.png)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'var(--dither-scale, 4px) var(--dither-scale, 4px)',
          imageRendering: 'pixelated',
          mixBlendMode: 'color-burn',
          opacity: 0.5,
        }}
      />

      {/* Layer 2: flat gray — global exposure / threshold shift.
          Blends with the already-burned result of layer 1 + page. */}
      <div
        aria-hidden="true"
        style={{
          ...layerBase,
          background: 'var(--dither-gray, #d4d4d8)',
          mixBlendMode: 'color-burn',
        }}
      />

      {/* Layer 3: white recovery — lifts highlights after the burn layers. */}
      {strategy !== 'none' && (
        <div
          aria-hidden="true"
          style={{
            ...layerBase,
            ...getLayer3Style(strategy),
          }}
        />
      )}
    </>
  )
}

function getLayer3Style(strategy: DitherStrategy): CSSProperties {
  switch (strategy) {
    case 'low-opacity':
      return {
        background: '#ffffff',
        mixBlendMode: 'color-dodge',
        opacity: 0.15,
      }
    case 'off-white':
      return {
        background: '#e4e4e7',  // gray-200
        mixBlendMode: 'color-dodge',
        opacity: 0.5,
      }
    case 'screen':
      return {
        background: '#ffffff',
        mixBlendMode: 'screen',
        opacity: 0.15,
      }
    case 'none':
    default:
      return {}
  }
}
