// apps/web/src/components/desktop/useWindowStore.ts
import { create } from 'zustand'
import type { SnapZone } from './snapUtils'

export interface WindowItem {
  id:          string
  type:        'post'
  slug:        string
  title:       string
  x:           number
  y:           number
  width:       number
  height:      number
  zIndex:      number
  snapZone:    SnapZone
  prevX:       number
  prevY:       number
  prevWidth:   number
  prevHeight:  number
  originX:     number
  originY:     number
}

interface WindowStore {
  windows:      WindowItem[]
  topZIndex:    number
  openWindow:   (params: { type: 'post'; slug: string; title: string; originX: number; originY: number }) => void
  closeWindow:  (id: string) => void
  focusWindow:  (id: string) => void
  updateWindow: (id: string, updates: Partial<WindowItem>) => void
}

const PAD = 10

function getRightHalfDimensions() {
  const w = typeof window !== 'undefined' ? window.innerWidth  : 1200
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  const innerW = w - PAD * 2
  const innerH = h - PAD * 2
  return {
    x:      PAD + innerW / 2,
    y:      PAD,
    width:  innerW / 2,
    height: innerH,
  }
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows:   [],
  topZIndex: 10,

  openWindow: ({ type, slug, title, originX, originY }) => {
    const { topZIndex, windows } = get()

    // Don't open the same post twice
    if (windows.find(w => w.slug === slug)) {
      const existing = windows.find(w => w.slug === slug)!
      get().focusWindow(existing.id)
      return
    }

    const nextZ = topZIndex + 1
    const id    = `${slug}-${Date.now()}`
    const dims  = getRightHalfDimensions()

    set((s) => ({
      windows: [...s.windows, {
        id,
        type,
        slug,
        title,
        ...dims,
        zIndex:     nextZ,
        snapZone:   'right',
        prevX:      dims.x,
        prevY:      dims.y,
        prevWidth:  dims.width,
        prevHeight: dims.height,
        originX,
        originY,
      }],
      topZIndex: nextZ,
    }))
  },

  closeWindow: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focusWindow: (id) => {
    const { topZIndex } = get()
    const nextZ = topZIndex + 1
    set((s) => ({
      windows:   s.windows.map((w) => w.id === id ? { ...w, zIndex: nextZ } : w),
      topZIndex: nextZ,
    }))
  },

  updateWindow: (id, updates) =>
    set((s) => ({
      windows: s.windows.map((w) => w.id === id ? { ...w, ...updates } : w),
    })),
}))