// apps/web/src/lib/graph.ts

import { TAG_CONFIG, getParentTags, getTagConfig } from '../config/graph'
import type { Post } from '@/types'

export type NodeType = 'entry' | 'tag' | 'hashtag'
export type EdgeType = 'tag' | 'hashtag' | 'link'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  description?: string
  icon?: string
  url?: string
  weight: number
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
  const entryIds   = new Set<string>()

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

  // ── 1. Parent tag nodes and subtag → parent edges ──────────────────────
  //
  // Seeded from TAG_CONFIG so these hub nodes always exist in the graph
  // regardless of whether any posts have been published for them yet.

  for (const [parentName, config] of Object.entries(TAG_CONFIG)) {
    const parentId = `tag-${slug(parentName)}`

    addNode({
      id: parentId,
      label: parentName,
      type: 'tag',
      ...(config.icon        ? { icon: config.icon }               : {}),
      ...(config.description ? { description: config.description } : {}),
    })

    for (const subtag of config.subtags ?? []) {
      const subtagId = `tag-${slug(subtag)}`

      addNode({ id: subtagId, label: subtag, type: 'tag' })
      addEdge({ source: subtagId, target: parentId, type: 'tag' })
    }
  }

  // ── 2. Entry nodes ─────────────────────────────────────────────────────

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

    // ── 3. Tag edges ──────────────────────────────────────────────────────
    //
    // `post.frontmatter.tags` already includes both explicit frontmatter tags
    // AND inline #hashtags extracted by content.ts, so no separate step is
    // needed here for inline tags — they are treated identically.

    const tags = post.frontmatter.tags ?? []

    // Parent tags already implied by subtags — skip the direct entry → parent
    // edge so the subtag → parent edge alone carries the relationship.
    const impliedParents = new Set(tags.flatMap(tag => getParentTags(tag)))

    for (const tag of tags) {
      const tagId = `tag-${slug(tag)}`
      const config = getTagConfig(tag)

      addNode({
        id: tagId,
        label: tag,
        type: 'tag',
        ...(config?.icon        ? { icon: config.icon }               : {}),
        ...(config?.description ? { description: config.description } : {}),
      })

      // Skip redundant direct edge when the tag is already a known parent
      if (impliedParents.has(tag)) continue

      addEdge({ source: entryId, target: tagId, type: 'tag' })
    }

    // ── 4. Connection (link) edges ─────────────────────────────────────────
    //
    // `post.frontmatter.connections` is the single source of truth for internal
    // links. content.ts merges both explicit frontmatter connections AND links
    // discovered by parsing the markdown body, so we don't need to regex the
    // raw content here.

    for (const connection of post.frontmatter.connections ?? []) {
      const target = slug(connection)
      // Dangling edges (target post doesn't exist) are filtered in step 5.
      edges.push({ source: entryId, target, type: 'link' })
    }
  }

  // ── 5. Remove dangling link edges ─────────────────────────────────────

  const validEdges = edges.filter(edge => {
    if (edge.type !== 'link') return true
    if (entryIds.has(edge.target)) return true
    console.warn(`Dangling link: ${edge.source} → ${edge.target}`)
    return false
  })

  // ── 6. Calculate weights ──────────────────────────────────────────────

  // First pass — direct connections only
  for (const node of nodes) {
    node.weight = validEdges.filter(
      e => e.source === node.id || e.target === node.id
    ).length
  }

  // Second pass — parent tag nodes inherit the sum of their subtags' weights
  // so they stay visually prominent even if no posts tag them directly.
  for (const [parentName, config] of Object.entries(TAG_CONFIG)) {
    const parentId   = `tag-${slug(parentName)}`
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) continue

    const inheritedWeight = (config.subtags ?? []).reduce((sum, subtag) => {
      const subtagNode = nodes.find(n => n.id === `tag-${slug(subtag)}`)
      return sum + (subtagNode?.weight ?? 0)
    }, 0)

    parentNode.weight = Math.max(parentNode.weight, inheritedWeight)
  }

  return { nodes, edges: validEdges }
}