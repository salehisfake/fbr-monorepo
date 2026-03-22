// apps/web/src/components/desktop/useWindowStore.ts
import { create } from 'zustand'

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

const PAD = 1

function getNewWindowPosition(existingWindows: WindowItem[], viewportHeight: number) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200
  const windowWidth = (w - PAD * 2) / 2
  const windowHeight = (window.innerHeight - PAD * 2) // Default height for new windows

  if (existingWindows.length === 0) {
    return {
      x: PAD,
      y: Math.max(PAD, (viewportHeight - windowHeight) / 2),
      width: windowWidth,
      height: windowHeight,
    }
  }

  // Find the rightmost window edge
  const rightmostEdge = Math.max(
    ...existingWindows.map(w => w.x + w.width)
  )

  return {
    x: rightmostEdge + 20,
    y: Math.max(PAD, (viewportHeight - windowHeight) / 2),
    width: windowWidth,
    height: windowHeight,
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
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const dims  = getNewWindowPosition(windows, viewportHeight)

    set((s) => ({
      windows: [...s.windows, {
        id,
        type,
        slug,
        title,
        ...dims,
        zIndex:     nextZ,
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