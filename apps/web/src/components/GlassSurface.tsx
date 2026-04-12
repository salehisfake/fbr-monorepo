// apps/web/src/components/GlassSurface.tsx
//
// The site's standard surface material:
//   glass fill (backdrop blur + semi-transparent bg)
//   white inner border
//   hard grey drop shadow + top inset highlight
//
// Usage:
//   <GlassSurface glass='DROPDOWN' style={{ position: 'absolute', top: 24, left: 0, minWidth: 180 }}>
//     {children}
//   </GlassSurface>
//
// The `style` prop is for layout (position, top, left, width, overflow, zIndex, etc.).
// Material properties (glass, border, shadow) are applied after and cannot be overridden via style.
// All standard HTML div attributes (role, aria-*, ref, onClick, etc.) are forwarded.

'use client'

import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { GLASS, COLORS, glassStyle } from '@/lib/tokens'

/** Scales the alpha in a `rgba(r,g,b,a)` string; returns new rgba or original if parse fails. */
function scaleRgbaAlpha(rgba: string, scale: number): string {
  if (scale === 1) return rgba
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(rgba.trim())
  if (!m) return rgba
  const a = Math.min(1, Math.max(0, parseFloat(m[4] ?? '1') * scale))
  return `rgba(${m[1]},${m[2]},${m[3]},${a})`
}

function glassStyleScaled(preset: keyof typeof GLASS, fillAlphaScale: number) {
  const { bg, blur } = GLASS[preset]
  return {
    background:           scaleRgbaAlpha(bg, fillAlphaScale),
    backdropFilter:       blur,
    WebkitBackdropFilter: blur,
  }
}

interface GlassSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  /** Glass preset from tokens. Default: 'WINDOW' */
  glass?:         keyof typeof GLASS
  /** Include the 2px hard drop shadow. Default: true */
  shadow?:        boolean
  /** Include the 1px white border. Default: true */
  border?:        boolean
  /** Opacity of the inset top-edge highlight (0–1). Default: 0.6 */
  insetOpacity?:  number
  /** Alpha for the 1px inner white border (0–1). Default: 0.5 */
  whiteBorderAlpha?: number
  /** Multiplies the glass preset fill alpha (e.g. 0.5 = half-opacity background). Default: 1 */
  glassFillAlphaScale?: number
  /** When false, strips all material (transparent, no blur). Default: true */
  active?:        boolean
  /** Layout overrides — position, top, left, width, overflow, zIndex, display, padding, etc. */
  style?:         CSSProperties
}

const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(function GlassSurface(
  {
    glass        = 'WINDOW',
    shadow       = true,
    border       = true,
    insetOpacity = 0.6,
    whiteBorderAlpha = 0.5,
    glassFillAlphaScale = 1,
    active       = true,
    style,
    children,
    ...htmlProps
  },
  ref,
) {
  const inset = `inset 0 1px 0 rgba(255,255,255,${insetOpacity})`

  const material: CSSProperties = active
    ? {
        ...(glassFillAlphaScale === 1 ? glassStyle(glass) : glassStyleScaled(glass, glassFillAlphaScale)),
        ...(border ? { border: `1px solid rgba(255,255,255,${whiteBorderAlpha})` } : {}),
        boxShadow:  shadow ? `0 1px 0 ${COLORS.LIGHT}, ${inset}` : inset,
        transition: 'box-shadow 150ms ease, border-color 150ms ease, background 150ms ease',
      }
    : {
        background:           'transparent',
        backdropFilter:       'none',
        WebkitBackdropFilter: 'none',
        border:               'none',
        boxShadow:            'none',
      }

  return (
    <div
      ref={ref}
      {...htmlProps}
      style={{
        position: 'relative',
        ...style,
        ...material,
      }}
    >
      {children}
    </div>
  )
})

export default GlassSurface
