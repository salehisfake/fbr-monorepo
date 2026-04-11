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

export interface BuildWarning {
  code: 'DUPLICATE_SLUG' | 'DANGLING_LINK' | 'BFS_ROOT_MISSING'
  message: string
  sourceId?: string
}

// ─────────────────────────────────────────────────────────────────────────────

function slugify(str: string): string {
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

/**
 * Calculates node weights via two passes:
 *   1. Direct connection count for every node.
 *   2. BFS subtree accumulation rooted at `rootId` — hub nodes grow larger
 *      proportional to total activity below them in the spanning tree.
 *
 * Nodes unreachable from `rootId` keep their direct-connection weight.
 * Returns the updated nodes (mutated in place) and any warnings emitted.
 */
export function calculateWeights(
  nodes: GraphNode[],
  edges: GraphEdge[],
  rootId: string,
): { warnings: BuildWarning[] } {
  const warnings: BuildWarning[] = []

  // Pass 1: direct connection count
  for (const node of nodes) {
    node.weight = edges.filter(
      e => e.source === node.id || e.target === node.id
    ).length
  }

  // Pass 2: BFS subtree accumulation
  const adj = new Map<string, string[]>()
  for (const node of nodes) adj.set(node.id, [])
  for (const edge of edges) {
    adj.get(edge.source as string)?.push(edge.target as string)
    adj.get(edge.target as string)?.push(edge.source as string)
  }

  if (!adj.has(rootId)) {
    warnings.push({
      code: 'BFS_ROOT_MISSING',
      message: `BFS root node '${rootId}' not found — subtree weight accumulation skipped`,
    })
  } else {
    const children = new Map<string, string[]>()
    const visited  = new Set<string>([rootId])
    const queue    = [rootId]
    const order: string[] = []

    while (queue.length) {
      const current = queue.shift()!
      order.push(current)
      children.set(current, [])
      for (const neighbour of adj.get(current) ?? []) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour)
          children.get(current)!.push(neighbour)
          queue.push(neighbour)
        }
      }
    }

    const acc = new Map<string, number>(nodes.map(n => [n.id, n.weight]))
    for (const nodeId of [...order].reverse()) {
      const childSum = (children.get(nodeId) ?? []).reduce(
        (sum, child) => sum + (acc.get(child) ?? 0), 0
      )
      acc.set(nodeId, (acc.get(nodeId) ?? 0) + childSum)
    }
    for (const node of nodes) {
      if (acc.has(node.id)) node.weight = acc.get(node.id)!
    }
  }

  // Apply fixed weight overrides
  for (const node of nodes) {
    if (node.fixedWeight !== undefined) node.weight = node.fixedWeight
  }

  return { warnings }
}

// ─────────────────────────────────────────────────────────────────────────────

export function buildGraphData(posts: Post[]): { data: GraphData; warnings: BuildWarning[] } {
  const warnings: BuildWarning[] = []
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const addedNodes = new Set<string>()
  const entryIds   = new Set<string>()

  function addNode(node: Omit<GraphNode, 'weight'>) {
    if (!addedNodes.has(node.id)) {
      nodes.push({ ...node, weight: 0 })
      addedNodes.add(node.id)
    }
  }

  function addEdge(edge: GraphEdge) {
    if (!hasEdge(edges, edge.source, edge.target)) edges.push(edge)
  }

  // ── Entry nodes ────────────────────────────────────────────────────────────

  for (const post of posts) {
    const entryId = slugify(post.slug)

    if (entryIds.has(entryId)) {
      warnings.push({
        code: 'DUPLICATE_SLUG',
        message: `Duplicate slug '${entryId}' — skipping`,
        sourceId: entryId,
      })
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

    // Frontmatter tags
    for (const tag of post.frontmatter.tags ?? []) {
      const tagId = `tag-${slugify(tag)}`
      addNode({ id: tagId, label: tag, type: 'tag' })
      addEdge({ source: entryId, target: tagId, type: 'tag' })
    }

    // Inline hashtags
    const cleanContent = stripCode(post.content)
    for (const match of cleanContent.matchAll(/#([A-Za-z0-9_-]+)/g)) {
      const tagId = `tag-${slugify(match[1])}`
      addNode({ id: tagId, label: match[1], type: 'tag' })
      addEdge({ source: entryId, target: tagId, type: 'tag' })
    }

    // Internal markdown links
    for (const match of cleanContent.matchAll(/(?<!!)\[.+?\]\((?!http)(.+?)\)/g)) {
      const target = slugify(match[1].replace(/\.md$/, ''))
      edges.push({ source: entryId, target, type: 'link' })
    }
  }

  // ── Remove dangling link edges ─────────────────────────────────────────────

  const validEdges = edges.filter(edge => {
    if (edge.type !== 'link') return true
    if (entryIds.has(edge.target)) return true
    warnings.push({
      code: 'DANGLING_LINK',
      message: `Dangling link '${edge.source}' → '${edge.target}' — removed`,
      sourceId: edge.source,
    })
    return false
  })

  // ── Weights ────────────────────────────────────────────────────────────────

  const { warnings: weightWarnings } = calculateWeights(nodes, validEdges, 'index')
  warnings.push(...weightWarnings)

  return { data: { nodes, edges: validEdges }, warnings }
}
