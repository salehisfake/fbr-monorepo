// apps/web/src/components/graph/labelCulling.ts
import type { GraphEdge, GraphNode } from '@/lib/graph'

/** Undirected adjacency for 1-hop “focus” labels (active / hover + neighbors). */
export function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>()
  const getEdgeId = (v: unknown): string | null => {
    if (typeof v === 'string') return v
    if (v && typeof v === 'object' && 'id' in (v as Record<string, unknown>)) {
      const id = (v as { id?: unknown }).id
      return typeof id === 'string' ? id : null
    }
    return null
  }
  const link = (a: string, b: string) => {
    if (!m.has(a)) m.set(a, new Set())
    if (!m.has(b)) m.set(b, new Set())
    m.get(a)!.add(b)
    m.get(b)!.add(a)
  }
  for (const e of edges) {
    const a = getEdgeId(e.source)
    const b = getEdgeId(e.target)
    if (!a || !b) continue
    link(a, b)
  }
  return m
}

/** Breadth-first hop distance from one or more seed nodes. */
export function buildHopMapFromSeeds(
  adj: Map<string, Set<string>>,
  seeds: Iterable<string>,
): Map<string, number> {
  const hop = new Map<string, number>()
  const q: string[] = []

  for (const id of seeds) {
    if (!id) continue
    if (hop.has(id)) continue
    hop.set(id, 0)
    q.push(id)
  }

  while (q.length) {
    const id = q.shift()!
    const d = hop.get(id) ?? 0
    adj.get(id)?.forEach((n) => {
      if (hop.has(n)) return
      hop.set(n, d + 1)
      q.push(n)
    })
  }
  return hop
}

export function rectsOverlap(a: DOMRect, b: DOMRect, pad: number): boolean {
  return !(
    a.right + pad < b.left - pad ||
    a.left - pad > b.right + pad ||
    a.bottom + pad < b.top - pad ||
    a.top - pad > b.bottom + pad
  )
}

/** Active node, hovered node, and all their graph neighbors — always get a label when zoom allows. */
export function collectForcedIds(
  activeId: string | null | undefined,
  hoveredId: string | null | undefined,
  adj: Map<string, Set<string>>,
): Set<string> {
  const s = new Set<string>()
  const addWithNeighbors = (id: string | null | undefined) => {
    if (!id) return
    s.add(id)
    adj.get(id)?.forEach((n) => s.add(n))
  }
  addWithNeighbors(activeId ?? null)
  addWithNeighbors(hoveredId ?? null)
  return s
}

/** Higher = more likely to win a slot among non-forced labels. */
export function priorityScore(d: GraphNode, cx: number, cy: number): number {
  const typeW = d.type === 'entry' ? 2 : 1
  const w = Math.log(1 + Math.max(0, d.weight))
  const x = d.x ?? 0
  const y = d.y ?? 0
  const dist = Math.hypot(x - cx, y - cy)
  const centerBonus = 80 / (1 + dist / 120)
  return typeW * w + centerBonus
}

/**
 * Greedy placement: forced ids always visible; other ids by descending priority,
 * skipping overlaps with already placed rects (including forced).
 */
export function selectVisibleLabelIds(
  nodes: GraphNode[],
  rects: Map<string, DOMRect>,
  forced: Set<string>,
  getPriority: (d: GraphNode) => number,
  maxNonForced: number,
  pad: number,
): Set<string> {
  const visible = new Set<string>(forced)

  const nonForced = nodes
    .filter((d) => !forced.has(d.id))
    .sort((a, b) => getPriority(b) - getPriority(a))

  const placed: DOMRect[] = []
  for (const id of forced) {
    const r = rects.get(id)
    if (r && r.width > 0 && r.height > 0) placed.push(r)
  }

  let placedNonForced = 0
  for (const d of nonForced) {
    if (placedNonForced >= maxNonForced) break
    const r = rects.get(d.id)
    if (!r || r.width < 1 || r.height < 1) continue
    if (placed.some((p) => rectsOverlap(r, p, pad))) continue
    visible.add(d.id)
    placed.push(r)
    placedNonForced++
  }

  return visible
}
