// apps/web/src/components/GlassSurface.tsx
//
// The site's standard surface material:
//   glass fill (backdrop blur + semi-transparent bg)
//   dither texture (at z:-1 so children need no explicit z-index)
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
import DitherOverlay from '@/components/DitherOverlay'
import { GLASS, COLORS, glassStyle } from '@/lib/tokens'

interface GlassSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  /** Glass preset from tokens. Default: 'WINDOW' */
  glass?:         keyof typeof GLASS
  /** Include the 2px hard drop shadow. Default: true */
  shadow?:        boolean
  /** Include the 1px white border. Default: true */
  border?:        boolean
  /** Opacity of the inset top-edge highlight (0–1). Default: 0.6 */
  insetOpacity?:  number
  /** When false, strips all material (transparent, no blur, no dither). Default: true */
  active?:        boolean
  /** When false, suppresses the dither texture overlay. Default: true */
  dither?:        boolean
  /** Layout overrides — position, top, left, width, overflow, zIndex, display, padding, etc. */
  style?:         CSSProperties
}

const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(function GlassSurface(
  {
    glass        = 'WINDOW',
    shadow       = true,
    border       = true,
    insetOpacity = 0.6,
    active       = true,
    dither       = true,
    style,
    children,
    ...htmlProps
  },
  ref,
) {
  const inset = `inset 0 1px 0 rgba(255,255,255,${insetOpacity})`

  const material: CSSProperties = active
    ? {
        ...glassStyle(glass),
        ...(border ? { border: `1px solid rgba(255,255,255,0.5)` } : {}),
        boxShadow: shadow ? `0 1px 0 ${COLORS.LIGHT}, ${inset}` : inset,
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
      {active && dither && (
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.2, pointerEvents: 'none' }}
        >
          <DitherOverlay position='absolute' zIndex={1} strategy='screen' />
        </div>
      )}
      {children}
    </div>
  )
})

export default GlassSurface
