// apps/web/src/lib/graph.ts

import type { Post } from '@/types'

export type NodeType = 'entry' | 'tag'
export type EdgeType = 'tag' | 'link'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  description?: string
  url?: string
  weight: number
  // When set, overrides the calculated connection-based weight for this node.
  // Useful for pinning tag nodes at a fixed visual size regardless of connections.
  fixedWeight?: number
}

export interface GraphEdge {
  source: string
  target: string
  type: EdgeType
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

function slug(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

function stripCode(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
}

function hasEdge(edges: GraphEdge[], a: string, b: string): boolean {
  return edges.some(
    e => (e.source === a && e.target === b) ||
         (e.source === b && e.target === a)
  )
}

export function buildGraphData(posts: Post[]): GraphData {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const addedNodes = new Set<string>()
  const entryIds = new Set<string>()

  function addNode(node: Omit<GraphNode, 'weight'>) {
    if (!addedNodes.has(node.id)) {
      nodes.push({ ...node, weight: 0 })
      addedNodes.add(node.id)
    }
  }

  function addEdge(edge: GraphEdge) {
    if (!hasEdge(edges, edge.source, edge.target)) {
      edges.push(edge)
    }
  }

  // ── 1. Entry nodes ──────────────────────────────────────────────────────────

  for (const post of posts) {
    const entryId = slug(post.slug)

    if (entryIds.has(entryId)) {
      console.warn(`Duplicate slug: ${entryId} — skipping`)
      continue
    }
    entryIds.add(entryId)

    addNode({
      id: entryId,
      label: post.frontmatter.title,
      type: 'entry',
      description: post.frontmatter.description,
      url: `/posts/${entryId}`,
    })

    // ── 2. Frontmatter tag edges ─────────────────────────────────────────────

    for (const tag of post.frontmatter.tags ?? []) {
      const tagId = `tag-${slug(tag)}`
      addNode({ id: tagId, label: tag, type: 'tag' })
      addEdge({ source: entryId, target: tagId, type: 'tag' })
    }

    // ── 3. Inline hashtags ──────────────────────────────────────────────────

    const cleanContent = stripCode(post.content)

    for (const match of cleanContent.matchAll(/#([A-Za-z0-9_-]+)/g)) {
      const tagId = `tag-${slug(match[1])}`
      addNode({ id: tagId, label: match[1], type: 'tag' })
      addEdge({ source: entryId, target: tagId, type: 'tag' })
    }

    // ── 4. Internal markdown links ──────────────────────────────────────────

    for (const match of cleanContent.matchAll(/(?<!!)\[.+?\]\((?!http)(.+?)\)/g)) {
      const target = slug(match[1].replace(/\.md$/, ''))
      edges.push({ source: entryId, target, type: 'link' })
    }
  }

  // ── 5. Remove dangling link edges ──────────────────────────────────────────

  const validEdges = edges.filter(edge => {
    if (edge.type !== 'link') return true
    if (entryIds.has(edge.target)) return true
    console.warn(`Dangling link: ${edge.source} → ${edge.target}`)
    return false
  })

  // ── 6. Calculate weights ────────────────────────────────────────────────────

  // Pass 1: direct connection count for every node
  for (const node of nodes) {
    node.weight = validEdges.filter(
      e => e.source === node.id || e.target === node.id
    ).length
  }

  // Pass 2: subtree accumulation rooted at 'index'.
  //
  // We do a BFS from 'index' to build a spanning tree (each node gets one
  // parent so there are no cycles). Then we walk back up from the leaves,
  // adding each node's accumulated weight to its parent. The result is that
  // hub nodes — those that sit above well-connected sub-graphs — grow larger
  // proportional to the total activity below them.
  //
  // Nodes not reachable from 'index' keep their direct-connection weight.

  const adj = new Map<string, string[]>()
  for (const node of nodes) adj.set(node.id, [])
  for (const edge of validEdges) {
    adj.get(edge.source as string)?.push(edge.target as string)
    adj.get(edge.target as string)?.push(edge.source as string)
  }

  const children  = new Map<string, string[]>()
  const visited   = new Set<string>(['index'])
  const bfsQueue  = ['index']
  const bfsOrder: string[] = []

  while (bfsQueue.length) {
    const current = bfsQueue.shift()!
    bfsOrder.push(current)
    children.set(current, [])
    for (const neighbour of adj.get(current) ?? []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour)
        children.get(current)!.push(neighbour)
        bfsQueue.push(neighbour)
      }
    }
  }

  // Walk reverse-BFS order so children are always processed before parents
  const acc = new Map<string, number>(nodes.map(n => [n.id, n.weight]))
  for (const nodeId of [...bfsOrder].reverse()) {
    const childSum = (children.get(nodeId) ?? []).reduce(
      (sum, child) => sum + (acc.get(child) ?? 0), 0
    )
    acc.set(nodeId, (acc.get(nodeId) ?? 0) + childSum)
  }
  for (const node of nodes) {
    if (acc.has(node.id)) node.weight = acc.get(node.id)!
  }

  // Apply fixed weight overrides (tag nodes can opt out of propagation)
  for (const node of nodes) {
    if (node.fixedWeight !== undefined) {
      node.weight = node.fixedWeight
    }
  }

  return { nodes, edges: validEdges }
}
