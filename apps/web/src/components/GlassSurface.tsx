// apps/web/src/components/GlassSurface.tsx
//
// Frosted glass surface: semi-transparent fill + backdrop blur only.
//
// The `style` prop is for layout (position, top, left, width, overflow, zIndex, etc.).
// Material (fill + blur) is applied after and cannot be overridden via style.
// All standard HTML div attributes (role, aria-*, ref, onClick, etc.) are forwarded.

'use client'

import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { GLASS, glassStyle } from '@/lib/tokens'

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
  glass?: keyof typeof GLASS
  /** Multiplies the glass preset fill alpha (e.g. 0.5 = half-opacity background). Default: 1 */
  glassFillAlphaScale?: number
  /** When false, strips all material (transparent, no blur). Default: true */
  active?: boolean
  /** Layout overrides — position, top, left, width, overflow, zIndex, display, padding, etc. */
  style?: CSSProperties
}

const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(function GlassSurface(
  {
    glass               = 'WINDOW',
    glassFillAlphaScale = 1,
    active              = true,
    style,
    children,
    ...htmlProps
  },
  ref,
) {
  const material: CSSProperties = active
    ? {
        ...(glassFillAlphaScale === 1 ? glassStyle(glass) : glassStyleScaled(glass, glassFillAlphaScale)),
        transition: 'background 150ms ease',
      }
    : {
        background:           'transparent',
        backdropFilter:       'none',
        WebkitBackdropFilter: 'none',
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
