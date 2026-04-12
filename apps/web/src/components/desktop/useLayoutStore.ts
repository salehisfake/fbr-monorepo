// apps/web/src/components/desktop/useLayoutStore.ts
import { create } from 'zustand'

// ── App types & state ─────────────────────────────────────────────────────────

export type AppType = 'post'

export interface AppState {
  post: { slug: string }
}

// ── Window item ───────────────────────────────────────────────────────────────

export interface WindowItem {
  id:       string
  appType:  AppType
  appState: AppState[AppType]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_WINDOWS     = 6
const DESKTOP_VISIBLE = 2  // slots shown side-by-side on desktop

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Path for graph home (no post window). Slug `index` maps to `/`. */
export function postPathFromSlug(slug: string): string {
  if (slug === 'index') return '/'
  return `/posts/${encodeURIComponent(slug)}`
}

export function parsePostPath(pathname: string): { kind: 'home' } | { kind: 'post'; slug: string } {
  const trimmed = pathname.replace(/\/+$/, '') || '/'
  if (trimmed === '/') return { kind: 'home' }
  const m = /^\/posts\/([^/]+)$/.exec(trimmed)
  if (!m) return { kind: 'home' }
  return { kind: 'post', slug: decodeURIComponent(m[1]) }
}

function pushUrl(slug: string, replace = false) {
  if (typeof window === 'undefined') return
  const url = postPathFromSlug(slug)
  if (replace) window.history.replaceState({ slug }, '', url)
  else         window.history.pushState({ slug }, '', url)
}

// ── Selector helpers ──────────────────────────────────────────────────────────

/**
 * Slug for URL / graph context. When `focusedId` is null but windows exist, user is on
 * the trailing graph slot — use the last window's slug for continuity (no URL push on tail alone).
 */
export function getFocusedSlug(state: LayoutStore): string {
  if (state.focusedId) {
    const w = state.windows.find(w => w.id === state.focusedId)
    if (w) return (w.appState as AppState['post']).slug
  }
  const last = state.windows[state.windows.length - 1]
  if (last) return (last.appState as AppState['post']).slug
  return 'index'
}

// ── Slot model: windows[0..n-1] + one trailing graph slot at index n ─────────

function slotCount(windowsLen: number): number {
  if (windowsLen === 0) return 0
  return windowsLen + 1
}

function clampOffset(offset: number, windowsLen: number): number {
  const sc = slotCount(windowsLen)
  if (sc <= DESKTOP_VISIBLE) return 0
  return Math.max(0, Math.min(offset, sc - DESKTOP_VISIBLE))
}

/** Pan so slot `slotIndex` sits on the right of the visible pair (when possible). */
function offsetForRightSlot(slotIndex: number, windowsLen: number): number {
  return clampOffset(slotIndex - (DESKTOP_VISIBLE - 1), windowsLen)
}

// ── Store interface ───────────────────────────────────────────────────────────

export interface LayoutStore {
  windows:          WindowItem[]
  /**
   * Active window id, or `null` when the trailing graph slot is focused (desktop: interact
   * with graph in that pane; `openPost` appends a window).
   */
  focusedId:        string | null
  /** Index of the left-most visible slot on desktop (each slot is a window or the graph tail). */
  viewOffset:       number
  /** Driven by DexGraph zoom — true once past the label zoom threshold. */
  panelVisible:     boolean
  /** Manual hide/show toggle for the entire panel strip. */
  panelCollapsed:   boolean
  /** Mobile only: which carousel page is visible (0 = graph, 1+ = window index+1). */
  mobileActivePage: number

  openPost(slug: string, options?: { replace?: boolean; skipPushState?: boolean }): void
  openBeside(slug: string): void
  closeWindow(id: string):  void
  focusWindow(id: string):  void
  /** Focus the trailing graph slot (after all windows). No-op if no windows. */
  focusGraphTail: () => void
  /** Desktop: previous/next slot (windows + graph tail at end, wraps). */
  focusAdjacentWindow(delta: -1 | 1): void
  setViewOffset(offset: number): void
  setPanelVisible(visible: boolean):      void
  setPanelCollapsed(collapsed: boolean):  void
  setMobileActivePage(page: number):      void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  windows:          [],
  focusedId:        null,
  viewOffset:       0,
  panelVisible:     true,
  panelCollapsed:   false,
  mobileActivePage: 0,

  // ── openPost ───────────────────────────────────────────────────────────────

  openPost: (slug, options) => {
    set((state) => {
      if (state.windows.length === 0) {
        const w: WindowItem = {
          id: crypto.randomUUID(), appType: 'post', appState: { slug },
        }
        if (!options?.skipPushState) pushUrl(slug, options?.replace)
        return { windows: [w], focusedId: w.id, viewOffset: 0, mobileActivePage: 1 }
      }

      // Trailing graph slot focused → append a new window (before the implicit tail).
      if (state.focusedId === null) {
        if (state.windows.length >= MAX_WINDOWS) return state
        const newW: WindowItem = {
          id: crypto.randomUUID(), appType: 'post', appState: { slug },
        }
        const newWindows = [...state.windows, newW]
        const insertIdx = newWindows.length - 1
        if (!options?.skipPushState) pushUrl(slug, options?.replace)
        return {
          windows:          newWindows,
          focusedId:        newW.id,
          viewOffset:       offsetForRightSlot(insertIdx, newWindows.length),
          mobileActivePage: newWindows.length,
        }
      }

      const targetId   = state.focusedId
      const targetIdx  = state.windows.findIndex(w => w.id === targetId)
      const newWindows = state.windows.map(w =>
        w.id === targetId ? { ...w, appState: { slug } } : w,
      )

      if (!options?.skipPushState) pushUrl(slug, options?.replace)
      const mobilePage = targetIdx >= 0 ? targetIdx + 1 : state.mobileActivePage
      return { windows: newWindows, focusedId: targetId, mobileActivePage: mobilePage }
    })
  },

  // ── openBeside ────────────────────────────────────────────────────────────

  openBeside: (slug) => {
    set((state) => {
      if (state.windows.length >= MAX_WINDOWS) return state

      const focusedIdx = state.focusedId
        ? state.windows.findIndex(w => w.id === state.focusedId)
        : -1
      const insertIdx = focusedIdx >= 0 ? focusedIdx + 1 : state.windows.length

      const newWindow: WindowItem = {
        id: crypto.randomUUID(), appType: 'post', appState: { slug },
      }
      const newWindows = [
        ...state.windows.slice(0, insertIdx),
        newWindow,
        ...state.windows.slice(insertIdx),
      ]

      pushUrl(slug)

      return {
        windows:          newWindows,
        focusedId:        newWindow.id,
        viewOffset:       offsetForRightSlot(insertIdx, newWindows.length),
        mobileActivePage: insertIdx + 1,
      }
    })
  },

  // ── closeWindow ───────────────────────────────────────────────────────────

  closeWindow: (id) => {
    set((state) => {
      const idx = state.windows.findIndex(w => w.id === id)
      if (idx === -1) return state

      const newWindows = state.windows.filter(w => w.id !== id)

      let newFocusedId = state.focusedId
      if (state.focusedId === id) {
        const newIdx     = Math.min(idx, newWindows.length - 1)
        newFocusedId     = newWindows[newIdx]?.id ?? null
      }

      const newViewOffset  = clampOffset(state.viewOffset, newWindows.length)
      const newMobilePage  = newFocusedId
        ? newWindows.findIndex(w => w.id === newFocusedId) + 1
        : 0

      if (newFocusedId) {
        const focused = newWindows.find(w => w.id === newFocusedId)
        if (focused) pushUrl((focused.appState as AppState['post']).slug)
      } else if (newWindows.length === 0) {
        pushUrl('index')
      }

      return {
        windows:          newWindows,
        focusedId:        newFocusedId,
        viewOffset:       newViewOffset,
        mobileActivePage: newMobilePage,
      }
    })
  },

  // ── focusWindow ───────────────────────────────────────────────────────────

  focusWindow: (id) => {
    set((state) => {
      const idx = state.windows.findIndex(w => w.id === id)
      if (idx === -1) return state

      const w = state.windows[idx]
      pushUrl((w.appState as AppState['post']).slug)

      const alreadyVisible = idx >= state.viewOffset && idx < state.viewOffset + DESKTOP_VISIBLE
      const newViewOffset  = alreadyVisible
        ? state.viewOffset
        : offsetForRightSlot(idx, state.windows.length)

      return {
        focusedId:        id,
        viewOffset:       newViewOffset,
        mobileActivePage: idx + 1,
      }
    })
  },

  focusGraphTail: () => {
    set((state) => {
      if (state.windows.length === 0) return state
      const n = state.windows.length
      return {
        focusedId:        null,
        viewOffset:       offsetForRightSlot(n, n),
        mobileActivePage: 0,
      }
    })
  },

  focusAdjacentWindow: (delta) => {
    const { windows, focusedId, focusWindow, focusGraphTail } = get()
    if (windows.length === 0) return
    const n = windows.length
    let slot: number
    if (focusedId === null) {
      slot = n
    } else {
      const idx = windows.findIndex(w => w.id === focusedId)
      slot = idx >= 0 ? idx : 0
    }
    const newSlot = (slot + delta + (n + 1)) % (n + 1)
    if (newSlot < n) {
      focusWindow(windows[newSlot].id)
    } else {
      focusGraphTail()
    }
  },

  setViewOffset:       (offset) => set((state) => ({ viewOffset: clampOffset(offset, state.windows.length) })),
  setPanelVisible:     (visible)   => set({ panelVisible: visible }),
  setPanelCollapsed:   (collapsed) => set({ panelCollapsed: collapsed }),
  setMobileActivePage: (page)      => set({ mobileActivePage: page }),
}))
