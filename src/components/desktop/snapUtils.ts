// apps/web/src/components/desktop/snapUtils.ts

export type SnapZone = 'left' | 'right' | 'full' | null

const THRESHOLD = 60
const PAD = 10

export function getSnapZone(
  x: number,
  y: number,
  screenW: number,
  screenH: number,
  winWidth: number = 0
): SnapZone {
  if (x < THRESHOLD)                      return 'left'
  if (x + winWidth > screenW - THRESHOLD) return 'right'
  return null
}

export interface SnapDimensions {
  x:      number
  y:      number
  width:  number
  height: number
}

export function getSnapDimensions(zone: SnapZone, screenW: number, screenH: number): SnapDimensions {
  const innerW = screenW - PAD * 2
  const innerH = screenH - PAD * 2
  const hw     = innerW / 2

  switch (zone) {
    case 'full':  return { x: PAD,      y: PAD, width: innerW, height: innerH }
    case 'left':  return { x: PAD,      y: PAD, width: hw,     height: innerH }
    case 'right': return { x: PAD + hw, y: PAD, width: hw,     height: innerH }
    default:      return { x: PAD + hw, y: PAD, width: hw,     height: innerH }
  }
}

export const SNAP_PREVIEW_STYLES: Record<NonNullable<SnapZone>, React.CSSProperties> = {
  'full':  { top: PAD, left: PAD,  right: PAD,  bottom: PAD                          },
  'left':  { top: PAD, left: PAD,  bottom: PAD, width: `calc(50% - ${PAD * 1.5}px)` },
  'right': { top: PAD, right: PAD, bottom: PAD, width: `calc(50% - ${PAD * 1.5}px)` },
}