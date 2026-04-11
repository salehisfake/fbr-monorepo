// apps/web/src/components/desktop/useLayoutStore.ts
import { create } from 'zustand'

// ── App types & state ─────────────────────────────────────────────────────────
// Extend AppType and AppState when adding new app types.

export type AppType = 'post'

export interface AppState {
  post: { slug: string }
}

// ── Layout tree nodes ─────────────────────────────────────────────────────────

// Discriminated union — each leaf carries its own appType + matching appState.
export type LeafNode = {
  [K in AppType]: {
    id: string
    type: 'leaf'
    appType: K
    appState: AppState[K]
  }
}[AppType]

export interface SplitNode {
  id: string
  type: 'split'
  /** 'h' = side-by-side columns, 'v' = stacked rows */
  direction: 'h' | 'v'
  /** Fraction of space allocated to `first` child (0–1). */
  ratio: number
  first: LayoutNode
  second: LayoutNode
}

export type LayoutNode = SplitNode | LeafNode

// ── Tree helpers (exported so components can use them) ────────────────────────

export function getLeaves(node: LayoutNode | null): LeafNode[] {
  if (!node) return []
  if (node.type === 'leaf') return [node]
  return [...getLeaves(node.first), ...getLeaves(node.second)]
}

function getDepth(node: LayoutNode): number {
  if (node.type === 'leaf') return 0
  return 1 + Math.max(getDepth(node.first), getDepth(node.second))
}

function removeLeaf(root: LayoutNode, id: string): LayoutNode | null {
  if (root.type === 'leaf') return root.id === id ? null : root
  const newFirst  = removeLeaf(root.first,  id)
  const newSecond = removeLeaf(root.second, id)
  if (newFirst  === null) return newSecond
  if (newSecond === null) return newFirst
  return { ...root, first: newFirst, second: newSecond }
}

function updateLeafSlug(root: LayoutNode, id: string, slug: string): LayoutNode {
  if (root.type === 'leaf') {
    if (root.id !== id || root.appType !== 'post') return root
    return { ...root, appState: { slug } }
  }
  return {
    ...root,
    first:  updateLeafSlug(root.first,  id, slug),
    second: updateLeafSlug(root.second, id, slug),
  }
}

function wrapLeafInSplit(
  root: LayoutNode,
  leafId: string,
  newLeaf: LeafNode,
  direction: 'h' | 'v',
): LayoutNode {
  if (root.type === 'leaf') {
    if (root.id !== leafId) return root
    return {
      id: crypto.randomUUID(),
      type: 'split',
      direction,
      ratio: 0.5,
      first:  root,
      second: newLeaf,
    }
  }
  return {
    ...root,
    first:  wrapLeafInSplit(root.first,  leafId, newLeaf, direction),
    second: wrapLeafInSplit(root.second, leafId, newLeaf, direction),
  }
}

function updateRatio(root: LayoutNode, splitId: string, ratio: number): LayoutNode {
  if (root.type === 'leaf') return root
  if (root.id === splitId) return { ...root, ratio }
  return {
    ...root,
    first:  updateRatio(root.first,  splitId, ratio),
    second: updateRatio(root.second, splitId, ratio),
  }
}

/** Path for the graph home (no post window). Post slug `index` still uses `/posts/index`. */
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

export function getFocusedLeaf(state: LayoutStore): LeafNode | null {
  const leaves = getLeaves(state.root)
  return leaves.find(l => l.id === state.focusedId) ?? null
}

export function getFocusedSlug(state: LayoutStore): string {
  const leaf = getFocusedLeaf(state)
  if (!leaf) return 'index'
  return (leaf.appState as AppState['post']).slug
}

// ── Store ─────────────────────────────────────────────────────────────────────

export interface LayoutStore {
  root:             LayoutNode | null
  focusedId:        string | null
  /** Driven by DexGraph zoom — true once past the label zoom threshold. */
  panelVisible:     boolean
  /** Manual hide/show toggle for the entire panel area. */
  panelCollapsed:   boolean
  /** Mobile only: which carousel page is visible (0 = graph, 1+ = leaf index+1). */
  mobileActivePage: number

  openPost: (
    slug: string,
    options?: { replace?: boolean; skipPushState?: boolean }
  ) => void
  splitOpen:          (slug: string, direction?: 'h' | 'v') => void
  closeWindow:        (id: string) => void
  focusWindow:        (id: string) => void
  setRatio:           (splitId: string, ratio: number) => void
  setPanelVisible:    (visible: boolean) => void
  setPanelCollapsed:  (collapsed: boolean) => void
  setMobileActivePage:(page: number) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  root:             null,
  focusedId:        null,
  panelVisible:     true,
  panelCollapsed:   false,
  mobileActivePage: 0,

  // ── openPost ───────────────────────────────────────────────────────────────
  // Regular click: replace the focused leaf's content, or create the first leaf.

  openPost: (slug, options) => {
    set((state) => {
      if (!state.root) {
        const leaf: LeafNode = {
          id: crypto.randomUUID(), type: 'leaf', appType: 'post', appState: { slug },
        }
        if (!options?.skipPushState) pushUrl(slug, options?.replace)
        return { root: leaf, focusedId: leaf.id, mobileActivePage: 1 }
      }

      const targetId = state.focusedId ?? getLeaves(state.root)[0]?.id
      if (!targetId) return state

      const newRoot  = updateLeafSlug(state.root, targetId, slug)
      const leaves   = getLeaves(newRoot)
      const leafIdx  = leaves.findIndex(l => l.id === targetId)
      const mobilePage = leafIdx >= 0 ? leafIdx + 1 : state.mobileActivePage

      if (!options?.skipPushState) pushUrl(slug, options?.replace)
      return { root: newRoot, focusedId: targetId, mobileActivePage: mobilePage }
    })
  },

  // ── splitOpen ─────────────────────────────────────────────────────────────
  // Shift+click: wrap focused leaf in a SplitNode, new leaf becomes second child.
  // Capped at depth 3 to prevent unusably small panes.

  splitOpen: (slug, direction = 'h') => {
    set((state) => {
      const newLeaf: LeafNode = {
        id: crypto.randomUUID(), type: 'leaf', appType: 'post', appState: { slug },
      }
      if (!state.root) {
        pushUrl(slug)
        return { root: newLeaf, focusedId: newLeaf.id, mobileActivePage: 1 }
      }
      if (getDepth(state.root) >= 3) return state  // depth cap

      const targetId = state.focusedId ?? getLeaves(state.root)[0]?.id
      if (!targetId) return state

      const newRoot    = wrapLeafInSplit(state.root, targetId, newLeaf, direction)
      const newLeaves  = getLeaves(newRoot)
      const mobilePage = newLeaves.length  // new leaf is last → page = count

      pushUrl(slug)
      return { root: newRoot, focusedId: newLeaf.id, mobileActivePage: mobilePage }
    })
  },

  // ── closeWindow ───────────────────────────────────────────────────────────
  // Remove leaf, promote sibling if parent split becomes single-child.

  closeWindow: (id) => {
    set((state) => {
      if (!state.root) return state

      const newRoot   = removeLeaf(state.root, id)
      const newLeaves = getLeaves(newRoot)

      let newFocusedId:    string | null = null
      let newMobilePage    = state.mobileActivePage

      if (newRoot) {
        if (state.focusedId && state.focusedId !== id) {
          newFocusedId = state.focusedId
          const idx = newLeaves.findIndex(l => l.id === newFocusedId)
          newMobilePage = idx >= 0 ? idx + 1 : 1
        } else {
          newFocusedId = newLeaves[0]?.id ?? null
          newMobilePage = newFocusedId ? 1 : 0
        }
        // Cap page to valid range
        newMobilePage = Math.min(newMobilePage, newLeaves.length)

        const focusedLeaf = newLeaves.find(l => l.id === newFocusedId)
        if (focusedLeaf) pushUrl((focusedLeaf.appState as AppState['post']).slug)
      } else {
        newMobilePage = 0
        pushUrl('index')
      }

      return { root: newRoot, focusedId: newFocusedId, mobileActivePage: newMobilePage }
    })
  },

  // ── focusWindow ───────────────────────────────────────────────────────────

  focusWindow: (id) => {
    set((state) => {
      const leaves  = getLeaves(state.root)
      const leaf    = leaves.find(l => l.id === id)
      const leafIdx = leaves.findIndex(l => l.id === id)
      const mobilePage = leafIdx >= 0 ? leafIdx + 1 : state.mobileActivePage

      if (leaf) pushUrl((leaf.appState as AppState['post']).slug)
      return { focusedId: id, mobileActivePage: mobilePage }
    })
  },

  // ── setRatio ──────────────────────────────────────────────────────────────

  setRatio: (splitId, ratio) => {
    set((state) => {
      if (!state.root) return state
      return { root: updateRatio(state.root, splitId, ratio) }
    })
  },

  setPanelVisible:     (visible)   => set({ panelVisible: visible }),
  setPanelCollapsed:   (collapsed) => set({ panelCollapsed: collapsed }),
  setMobileActivePage: (page)      => set({ mobileActivePage: page }),
}))
