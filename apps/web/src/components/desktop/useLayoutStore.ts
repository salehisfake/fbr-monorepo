// apps/web/src/components/desktop/useLayoutStore.ts
import { create } from 'zustand'
import { BREAKPOINTS } from '@/lib/tokens'

/** crypto.randomUUID is unavailable in older mobile WebViews (iOS < 15.4). */
function uuid(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID()
    } catch {
      // Fall through to getRandomValues/Math.random fallback.
    }
  }

  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)

    // RFC 4122 version and variant bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  }

  // Last-resort RFC 4122 v4 fallback using Math.random.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── App types & state ─────────────────────────────────────────────────────────

export type AppType = 'post' | 'tag'

export interface AppState {
  post: { slug: string }
  tag:  { tagSlug: string }
}

// ── Window item ───────────────────────────────────────────────────────────────

export type WindowItem =
  | { id: string; appType: 'post'; appState: AppState['post'] }
  | { id: string; appType: 'tag'; appState: AppState['tag'] }

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_WINDOWS     = 6
const DESKTOP_VISIBLE = 2  // slots shown side-by-side on desktop

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Path for graph home (no post window). Slug `index` maps to `/`. */
export function postPathFromSlug(slug: string): string {
  if (slug === 'index') return '/'
  return `/posts/${encodeURIComponent(slug)}`
}

export function tagPathFromSlug(tagSlug: string): string {
  return `/tag/${encodeURIComponent(tagSlug)}`
}

export function pathForWindowItem(w: WindowItem): string {
  if (w.appType === 'post') return postPathFromSlug(w.appState.slug)
  return tagPathFromSlug(w.appState.tagSlug)
}

export function parseContentPath(pathname: string):
  | { kind: 'home' }
  | { kind: 'post'; slug: string }
  | { kind: 'tag'; tagSlug: string } {
  const trimmed = pathname.replace(/\/+$/, '') || '/'
  if (trimmed === '/') return { kind: 'home' }
  const tagM = /^\/tag\/([^/]+)$/.exec(trimmed)
  if (tagM) return { kind: 'tag', tagSlug: decodeURIComponent(tagM[1]) }
  const m = /^\/posts\/([^/]+)$/.exec(trimmed)
  if (m) return { kind: 'post', slug: decodeURIComponent(m[1]) }
  return { kind: 'home' }
}

/** @deprecated Prefer parseContentPath — this maps only `/posts/…` to a post. */
export function parsePostPath(pathname: string): { kind: 'home' } | { kind: 'post'; slug: string } {
  const p = parseContentPath(pathname)
  if (p.kind === 'post') return p
  return { kind: 'home' }
}

function pushBrowserPath(path: string, replace = false) {
  if (typeof window === 'undefined') return
  if (replace) window.history.replaceState({}, '', path)
  else         window.history.pushState({}, '', path)
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < BREAKPOINTS.MOBILE
}

// ── Selector helpers ──────────────────────────────────────────────────────────

/**
 * Graph node id for the focused (or last) window: entry slug, or `tag-{slug}` for tag views.
 * Used to align the pulse / highlight with the correct graph node.
 */
export function getFocusedGraphNodeId(state: LayoutStore): string {
  if (state.focusedId) {
    const w = state.windows.find((x) => x.id === state.focusedId)
    if (w) {
      if (w.appType === 'post') return w.appState.slug
      return `tag-${w.appState.tagSlug}`
    }
  }
  const last = state.windows[state.windows.length - 1]
  if (last) {
    if (last.appType === 'post') return last.appState.slug
    return `tag-${last.appState.tagSlug}`
  }
  return 'index'
}

/** @deprecated Use getFocusedGraphNodeId */
export const getFocusedSlug = getFocusedGraphNodeId

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

function offsetForRightSlot(slotIndex: number, windowsLen: number): number {
  return clampOffset(slotIndex - (DESKTOP_VISIBLE - 1), windowsLen)
}

// ── Store interface ───────────────────────────────────────────────────────────

export interface LayoutStore {
  windows:          WindowItem[]
  focusedId:        string | null
  viewOffset:       number
  panelVisible:     boolean
  panelCollapsed:   boolean
  mobileActivePage: number

  openPost(slug: string, options?: { replace?: boolean; skipPushState?: boolean }): void
  openTag(tagSlug: string, options?: { replace?: boolean; skipPushState?: boolean }): void
  openBeside(slug: string): void
  openBesideTag(tagSlug: string): void
  closeWindow(id: string):  void
  focusWindow(id: string):  void
  focusGraphTail: () => void
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

  openPost: (slug, options) => {
    set((state) => {
      if (state.windows.length === 0) {
        const w: WindowItem = {
          id: uuid(), appType: 'post', appState: { slug },
        }
        if (!options?.skipPushState) pushBrowserPath(postPathFromSlug(slug), options?.replace)
        return { windows: [w], focusedId: w.id, viewOffset: 0, mobileActivePage: 1 }
      }

      if (state.focusedId === null) {
        if (state.windows.length > 0 && isMobileViewport()) {
          const targetIdx = state.windows.length - 1
          const target = state.windows[targetIdx]
          const newWindows = state.windows.map((w, idx) =>
            idx === targetIdx
              ? { ...w, appType: 'post' as const, appState: { slug } }
              : w,
          )
          if (!options?.skipPushState) pushBrowserPath(postPathFromSlug(slug), options?.replace)
          return {
            windows:          newWindows,
            focusedId:        target.id,
            viewOffset:       offsetForRightSlot(targetIdx, newWindows.length),
            mobileActivePage: targetIdx + 1,
          }
        }
        if (state.windows.length >= MAX_WINDOWS) return state
        const newW: WindowItem = {
          id: uuid(), appType: 'post', appState: { slug },
        }
        const newWindows = [...state.windows, newW]
        const insertIdx = newWindows.length - 1
        if (!options?.skipPushState) pushBrowserPath(postPathFromSlug(slug), options?.replace)
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
        w.id === targetId
          ? { ...w, appType: 'post' as const, appState: { slug } }
          : w,
      )

      if (!options?.skipPushState) pushBrowserPath(postPathFromSlug(slug), options?.replace)
      const mobilePage = targetIdx >= 0 ? targetIdx + 1 : state.mobileActivePage
      return { windows: newWindows, focusedId: targetId, mobileActivePage: mobilePage }
    })
  },

  openTag: (tagSlug, options) => {
    set((state) => {
      if (state.windows.length === 0) {
        const w: WindowItem = {
          id: uuid(), appType: 'tag', appState: { tagSlug },
        }
        if (!options?.skipPushState) pushBrowserPath(tagPathFromSlug(tagSlug), options?.replace)
        return { windows: [w], focusedId: w.id, viewOffset: 0, mobileActivePage: 1 }
      }

      if (state.focusedId === null) {
        if (state.windows.length > 0 && isMobileViewport()) {
          const targetIdx = state.windows.length - 1
          const target = state.windows[targetIdx]
          const newWindows = state.windows.map((w, idx) =>
            idx === targetIdx
              ? { ...w, appType: 'tag' as const, appState: { tagSlug } }
              : w,
          )
          if (!options?.skipPushState) pushBrowserPath(tagPathFromSlug(tagSlug), options?.replace)
          return {
            windows:          newWindows,
            focusedId:        target.id,
            viewOffset:       offsetForRightSlot(targetIdx, newWindows.length),
            mobileActivePage: targetIdx + 1,
          }
        }
        if (state.windows.length >= MAX_WINDOWS) return state
        const newW: WindowItem = {
          id: uuid(), appType: 'tag', appState: { tagSlug },
        }
        const newWindows = [...state.windows, newW]
        const insertIdx = newWindows.length - 1
        if (!options?.skipPushState) pushBrowserPath(tagPathFromSlug(tagSlug), options?.replace)
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
        w.id === targetId
          ? { ...w, appType: 'tag' as const, appState: { tagSlug } }
          : w,
      )

      if (!options?.skipPushState) pushBrowserPath(tagPathFromSlug(tagSlug), options?.replace)
      const mobilePage = targetIdx >= 0 ? targetIdx + 1 : state.mobileActivePage
      return { windows: newWindows, focusedId: targetId, mobileActivePage: mobilePage }
    })
  },

  openBeside: (slug) => {
    set((state) => {
      if (state.windows.length >= MAX_WINDOWS) return state

      const focusedIdx = state.focusedId
        ? state.windows.findIndex(w => w.id === state.focusedId)
        : -1
      const insertIdx = focusedIdx >= 0 ? focusedIdx + 1 : state.windows.length

      const newWindow: WindowItem = {
        id: uuid(), appType: 'post', appState: { slug },
      }
      const newWindows = [
        ...state.windows.slice(0, insertIdx),
        newWindow,
        ...state.windows.slice(insertIdx),
      ]

      pushBrowserPath(postPathFromSlug(slug))

      return {
        windows:          newWindows,
        focusedId:        newWindow.id,
        viewOffset:       offsetForRightSlot(insertIdx, newWindows.length),
        mobileActivePage: insertIdx + 1,
      }
    })
  },

  openBesideTag: (tagSlug) => {
    set((state) => {
      if (state.windows.length >= MAX_WINDOWS) return state

      const focusedIdx = state.focusedId
        ? state.windows.findIndex(w => w.id === state.focusedId)
        : -1
      const insertIdx = focusedIdx >= 0 ? focusedIdx + 1 : state.windows.length

      const newWindow: WindowItem = {
        id: uuid(), appType: 'tag', appState: { tagSlug },
      }
      const newWindows = [
        ...state.windows.slice(0, insertIdx),
        newWindow,
        ...state.windows.slice(insertIdx),
      ]

      pushBrowserPath(tagPathFromSlug(tagSlug))

      return {
        windows:          newWindows,
        focusedId:        newWindow.id,
        viewOffset:       offsetForRightSlot(insertIdx, newWindows.length),
        mobileActivePage: insertIdx + 1,
      }
    })
  },

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
        if (focused) pushBrowserPath(pathForWindowItem(focused))
      } else if (newWindows.length === 0) {
        pushBrowserPath('/')
      }

      return {
        windows:          newWindows,
        focusedId:        newFocusedId,
        viewOffset:       newViewOffset,
        mobileActivePage: newMobilePage,
      }
    })
  },

  focusWindow: (id) => {
    set((state) => {
      const idx = state.windows.findIndex(w => w.id === id)
      if (idx === -1) return state

      const w = state.windows[idx]
      pushBrowserPath(pathForWindowItem(w))

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
