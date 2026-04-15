// apps/web/src/components/desktop/useLayoutStore.ts
import { create } from 'zustand'

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

export type WindowItem =
  | { id: string; appType: 'post'; appState: AppState['post'] }
  | { id: string; appType: 'tag'; appState: AppState['tag'] }

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Path for graph home (no open window). Slug index maps to /. */
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

/** @deprecated Prefer parseContentPath — this maps only /posts/… to a post. */
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

// ── Selector helpers ──────────────────────────────────────────────────────────

/**
 * Graph node id for the focused (or current) window: entry slug, or `tag-{slug}`.
 * When no window is open, focus falls back to the graph home node.
 */
export function getFocusedGraphNodeId(state: LayoutStore): string {
  if (state.focusedId) {
    const w = state.windows.find((x) => x.id === state.focusedId)
    if (w) {
      if (w.appType === 'post') return w.appState.slug
      return `tag-${w.appState.tagSlug}`
    }
  }
  const current = state.windows[0]
  if (current) {
    if (current.appType === 'post') return current.appState.slug
    return `tag-${current.appState.tagSlug}`
  }
  return 'index'
}

/** @deprecated Use getFocusedGraphNodeId */
export const getFocusedSlug = getFocusedGraphNodeId

// ── Store interface ───────────────────────────────────────────────────────────

export interface LayoutStore {
  windows:   WindowItem[]
  focusedId: string | null

  openPost(slug: string, options?: { replace?: boolean; skipPushState?: boolean }): void
  openTag(tagSlug: string, options?: { replace?: boolean; skipPushState?: boolean }): void
  closeWindow(id: string):  void
  focusWindow(id: string):  void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useLayoutStore = create<LayoutStore>((set) => ({
  windows:   [],
  focusedId: null,

  openPost: (slug, options) => {
    set(() => {
      const id = uuid()
      if (!options?.skipPushState) pushBrowserPath(postPathFromSlug(slug), options?.replace)
      return {
        windows: [{ id, appType: 'post', appState: { slug } }],
        focusedId: id,
      }
    })
  },

  openTag: (tagSlug, options) => {
    set(() => {
      const id = uuid()
      if (!options?.skipPushState) pushBrowserPath(tagPathFromSlug(tagSlug), options?.replace)
      return {
        windows: [{ id, appType: 'tag', appState: { tagSlug } }],
        focusedId: id,
      }
    })
  },

  closeWindow: (id) => {
    set((state) => {
      const w = state.windows[0]
      if (!w || w.id !== id) return state
      pushBrowserPath('/')
      return {
        windows: [],
        focusedId: null,
      }
    })
  },

  focusWindow: (id) => {
    set((state) => {
      const w = state.windows[0]
      if (!w || w.id !== id) return state
      pushBrowserPath(pathForWindowItem(w))
      return {
        focusedId: id,
      }
    })
  },
}))
