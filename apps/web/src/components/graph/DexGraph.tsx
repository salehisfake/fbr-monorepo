// apps/web/src/components/graph/DexGraph.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useGraphSimulation } from './useGraphSimulation'
import { getNodeStyle, appendShape, type NodeType } from './graphUtils'
import { COLORS } from './graphConstants'
import { DURATION } from '@/lib/tokens'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/graph'
import { formatTagDisplay } from '@/lib/formatTagDisplay'
import { slugifyTag } from '@/lib/tagSlug'
import { useLayoutStore, getFocusedGraphNodeId } from '@/components/desktop/useLayoutStore'
import { useMenuStore } from '@/components/desktop/useMenuStore'

/** Keep labels visible at all zoom levels. */
const LABEL_ZOOM_THRESHOLD = 0

/** Resolves link endpoint ids after d3-force may have replaced string refs with node objects. */
function edgeEndpointIds(d: { source: unknown; target: unknown }): { sid: string; tid: string } {
  const sid = typeof d.source === 'object' && d.source !== null && 'id' in d.source
    ? String((d.source as GraphNode).id)
    : String(d.source)
  const tid = typeof d.target === 'object' && d.target !== null && 'id' in d.target
    ? String((d.target as GraphNode).id)
    : String(d.target)
  return { sid, tid }
}

type ArrowDirectionKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
const DIRECTION_BY_KEY: Record<ArrowDirectionKey, { x: number; y: number }> = {
  ArrowUp:    { x: 0,  y: -1 },
  ArrowDown:  { x: 0,  y: 1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1,  y: 0 },
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DexGraph() {
  const FOCUSED_LABEL_OFFSET_X = 8
  const svgRef           = useRef<SVGSVGElement>(null)
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null)
  const linkRef          = useRef<d3.Selection<SVGLineElement, GraphEdge, SVGGElement, unknown> | null>(null)
  const nodeRef          = useRef<d3.Selection<SVGGElement,    GraphNode, SVGGElement, unknown> | null>(null)
  const [graphData,   setGraphData]   = useState<GraphData | null>(null)
  const [dimensions,  setDimensions]  = useState({ width: 0, height: 0 })
  const zoomScaleRef     = useRef(1)
  const openPost         = useLayoutStore((s) => s.openPost)
  const openTag          = useLayoutStore((s) => s.openTag)
  const focusedId        = useLayoutStore((s) => s.focusedId)
  const activeSlug       = useLayoutStore(getFocusedGraphNodeId)
  const simPreset        = useMenuStore((s) => s.simPreset)
  const showDebugOverlay = useMenuStore((s) => s.showDebugOverlay)
  const activeSlugRef    = useRef<string | null>(focusedId ? activeSlug : null)
  const pulseGroupRef    = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const graphDataRef     = useRef<GraphData | null>(null)
  const rafRef           = useRef<number | null>(null)
  const labelRef         = useRef<d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null>(null)
  const zoomBehaviorRef  = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodeMapRef       = useRef<Map<string, GraphNode>>(new Map())
  const adjacencyRef     = useRef<Map<string, string[]>>(new Map())
  const graphNodesRef    = useRef<GraphNode[]>([])
  const dimensionsRef    = useRef({ width: 0, height: 0 })
  const hoveredNodeIdRef   = useRef<string | null>(null)

  // ── Sync refs ───────────────────────────────────────────────────────────────

  useEffect(() => { graphDataRef.current = graphData }, [graphData])
  useEffect(() => { dimensionsRef.current = dimensions }, [dimensions])

  // ── Parallax node transform ─────────────────────────────────────────────────

  function getNodeTransform(d: any, k: number): string {
    const multiplier = d.type === 'tag'
      ? 1 + (k - 1) * (0.01 + Math.min(d.weight * 0.01, 0.05))
      : 1 + (k - 1) * -0.1
    return `translate(${d.x},${d.y}) scale(${multiplier})`
  }

  // ── Tick ────────────────────────────────────────────────────────────────────

  const ticked = useCallback(() => {
    linkRef.current
      ?.attr('x1', (d: any) => d.source.x)
       .attr('y1', (d: any) => d.source.y)
       .attr('x2', (d: any) => d.target.x)
       .attr('y2', (d: any) => d.target.y)

    nodeRef.current
      ?.attr('transform', (d: any) => getNodeTransform(d, zoomScaleRef.current))

    const activeNode = activeSlugRef.current
      ? (nodeMapRef.current.get(activeSlugRef.current) as any)
      : null
    if (activeNode?.x !== undefined && pulseGroupRef.current) {
      pulseGroupRef.current.attr('transform', `translate(${activeNode.x},${activeNode.y})`)
    } else if (pulseGroupRef.current) {
      pulseGroupRef.current.attr('transform', 'translate(-9999,-9999)')
    }
  }, [])

  function applyFocusedLabelOffset(selectedSlug: string | null) {
    const nodes = nodeRef.current
    if (!nodes) return

    nodes.selectAll<SVGTextElement, GraphNode>('text')
      .attr('x', (d) => {
        const baseX = getNodeStyle(d.type as NodeType).textX
        return d.id === selectedSlug ? baseX + FOCUSED_LABEL_OFFSET_X : baseX
      })
  }

  function buildAdjacency(nodes: GraphNode[], edges: GraphEdge[]) {
    const adjacency = new Map<string, Set<string>>()

    for (const node of nodes) adjacency.set(node.id, new Set())

    for (const edge of edges) {
      const { sid, tid } = edgeEndpointIds(edge as { source: unknown; target: unknown })
      if (!adjacency.has(sid)) adjacency.set(sid, new Set())
      if (!adjacency.has(tid)) adjacency.set(tid, new Set())
      adjacency.get(sid)?.add(tid)
      adjacency.get(tid)?.add(sid)
    }

    adjacencyRef.current = new Map(
      Array.from(adjacency.entries()).map(([id, neighbors]) => [id, Array.from(neighbors)]),
    )
  }

  function pickDirectionalNeighbor(currentId: string, key: ArrowDirectionKey): string | null {
    const current = nodeMapRef.current.get(currentId)
    if (!current || current.x === undefined || current.y === undefined) return null

    const candidates = adjacencyRef.current.get(currentId) ?? []
    if (!candidates.length) return null

    const direction = DIRECTION_BY_KEY[key]
    let bestId: string | null = null
    let bestScore = -Infinity

    for (const candidateId of candidates) {
      const candidate = nodeMapRef.current.get(candidateId)
      if (!candidate || candidate.x === undefined || candidate.y === undefined) continue

      const dx = candidate.x - current.x
      const dy = candidate.y - current.y
      const distance = Math.hypot(dx, dy)
      if (distance < 0.001) continue

      // Cosine similarity with requested direction: +1 is perfect alignment.
      const alignment = (dx * direction.x + dy * direction.y) / distance
      if (alignment <= 0.2) continue

      // Prefer directional alignment strongly, then nearer linked nodes.
      const score = alignment * 100 - distance
      if (score > bestScore) {
        bestScore = score
        bestId = candidateId
      }
    }

    return bestId
  }

  const refreshLinkStyles = useCallback(() => {
    const links = linkRef.current
    if (!links) return
    const focusSlug = focusedId ? activeSlug : null
    const hoverId = hoveredNodeIdRef.current

    links.each(function (this: SVGLineElement, d: GraphEdge) {
      const line = d3.select<SVGLineElement, GraphEdge>(this)
      const { sid, tid } = edgeEndpointIds(d as { source: unknown; target: unknown })

      const touchesFocus = !!(focusSlug && (sid === focusSlug || tid === focusSlug))
      const touchesHover = !!(hoverId && (sid === hoverId || tid === hoverId))

      if (touchesHover) {
        line
          .attr('stroke', COLORS.MID)
          .attr('stroke-width', 0.8)
          .attr('stroke-opacity', 1)
          .attr('stroke-linecap', 'square')
          .attr('stroke-dasharray', '2 2')
        return
      }

      if (touchesFocus) {
        line
          .attr('stroke', COLORS.MID)
          .attr('stroke-width', 0.75)
          .attr('stroke-opacity', 1)
          .attr('stroke-linecap', 'square')
          .attr('stroke-dasharray', '2 2')
        return
      }

      line
        .attr('stroke', COLORS.MID)
        .attr('stroke-width', 0.6)
        .attr('stroke-opacity', 1)
        .attr('stroke-linecap', 'square')
        .attr('stroke-dasharray', '2 2')
    })
  }, [focusedId, activeSlug])

  const { simulationRef } = useGraphSimulation({
    nodes:  graphData?.nodes ?? [],
    edges:  graphData?.edges ?? [],
    width:  dimensions.width,
    height: dimensions.height,
    onTick: ticked,
    simPreset,
  })

  // ── Track active slug + reposition pulse orb ────────────────────────────────

  useEffect(() => {
    const selectedSlug = focusedId ? activeSlug : null
    activeSlugRef.current = selectedSlug
    applyFocusedLabelOffset(selectedSlug)
    const node = selectedSlug ? (nodeMapRef.current.get(selectedSlug) as any) : null
    if (node?.x !== undefined && pulseGroupRef.current) {
      pulseGroupRef.current.attr('transform', `translate(${node.x},${node.y})`)
    } else if (pulseGroupRef.current) {
      pulseGroupRef.current.attr('transform', 'translate(-9999,-9999)')
    }
  }, [activeSlug, focusedId])

  useEffect(() => {
    refreshLinkStyles()
  }, [focusedId, activeSlug, refreshLinkStyles])

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      return target.isContentEditable || !!target.closest('[contenteditable="true"]')
    }

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key as ArrowDirectionKey
      if (!(key in DIRECTION_BY_KEY)) return
      if (isEditableTarget(event.target)) return

      const currentId = activeSlugRef.current ?? activeSlug
      if (!currentId) return

      const nextId = pickDirectionalNeighbor(currentId, key)
      if (!nextId) return

      const nextNode = nodeMapRef.current.get(nextId)
      if (!nextNode) return

      event.preventDefault()
      if (nextNode.type === 'tag') {
        const tagSlug = nextNode.id.startsWith('tag-')
          ? nextNode.id.slice(4)
          : slugifyTag(nextNode.label)
        openTag(tagSlug)
        return
      }
      if (nextNode.url) openPost(nextNode.id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeSlug, openPost, openTag])

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/graph.json')
      .then(r => r.json())
      .then((data: GraphData) => setGraphData(data))
      .catch(console.error)
  }, [])

  // ── Resize observer ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!svgRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDimensions({ width, height })
    })
    ro.observe(svgRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Draw ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!svgRef.current || !graphData || !dimensions.width) return
    const nodes = [
      ...graphData.nodes.filter(n => n.type === 'entry'),
      ...graphData.nodes.filter(n => n.type === 'tag'),
    ]
    const edges = graphData.edges
    graphNodesRef.current = nodes
    dimensionsRef.current = dimensions
    const { width, height } = dimensions

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
    svg.selectAll('*').remove()

    // ── Pulse-orb animation ──────────────────────────────────────────────────

    svg.append('style').text(`
      @keyframes orb-ripple {
        0%   { transform: scale(1); }
        100% { transform: scale(2.8); }
      }
      .orb-ring {
        animation: orb-ripple ${DURATION.ORB_RIPPLE} ease-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      .orb-ring-2 { animation-delay: 1.27s; }
      .orb-ring-3 { animation-delay: 2.53s; }
    `)

    const root = svg.append('g')

    // Layer order (bottom → top): pulse → links → nodes
    const pulseLayer = root.append('g').attr('class', 'pulse-layer')
      .attr('transform', 'translate(-9999,-9999)')
    ;[1, 2, 3].forEach(i => {
      pulseLayer.append('rect')
        .attr('x', -5).attr('y', -5)
        .attr('width', 10).attr('height', 10)
        .attr('rx', 0)
        .attr('fill', 'none')
        .attr('stroke', COLORS.BLACK)
        .attr('stroke-width', 0.6)
        .attr('class', i === 1 ? 'orb-ring' : `orb-ring orb-ring-${i}`)
    })
    pulseGroupRef.current = pulseLayer

    const linkGroup = root.append('g').attr('class', 'links')
    const nodeGroup = root.append('g').attr('class', 'nodes')

    // ── Zoom ─────────────────────────────────────────────────────────────────

    const setLabelVisibility = (k: number) => {
      labelRef.current
        ?.style('display', k < LABEL_ZOOM_THRESHOLD ? 'none' : 'block')
    }

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 5])
      .interpolate(d3.interpolateZoom)
      .duration(200)
      .on('zoom', (event) => {
        zoomTransformRef.current = event.transform
        root.attr('transform', event.transform)

        const k = event.transform.k
        zoomScaleRef.current = k

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          nodeRef.current?.attr('transform', (d: any) => getNodeTransform(d, k))
          rafRef.current = null
        })

        setLabelVisibility(k)
      })
    zoomBehaviorRef.current = zoomBehavior

    svg.call(zoomBehavior)

    // ── Links ─────────────────────────────────────────────────────────────────

    linkRef.current = linkGroup
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(edges)
      .join('line')
      .attr('stroke', COLORS.MID)
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 0.6)
      .attr('stroke-linecap', 'square')
      .attr('stroke-dasharray', '2 2')
      .attr('shape-rendering', 'crispEdges')
      .attr('vector-effect', 'non-scaling-stroke') as any

    // ── Nodes ─────────────────────────────────────────────────────────────────

    nodeRef.current = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('mouseover', (_e, d) => {
        hoveredNodeIdRef.current = d.id
        refreshLinkStyles()
      })
      .on('mouseleave', () => {
        hoveredNodeIdRef.current = null
        refreshLinkStyles()
      })
      .on('click', (event, d) => {
        if (d.type === 'tag') {
          const tagSlug = d.id.startsWith('tag-') ? d.id.slice(4) : slugifyTag(d.label)
          openTag(tagSlug)
          return
        }
        if (d.url) {
          openPost(d.id)
        }
      })
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d: any) => {
            if (!event.active) simulationRef.current?.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d: any) => {
            d.fx = event.x; d.fy = event.y
          })
          .on('end', (event, d: any) => {
            if (!event.active) simulationRef.current?.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      ) as any

    nodeRef.current?.each(function(d) {
      const el    = d3.select<SVGGElement, GraphNode>(this as SVGGElement)
      const style = getNodeStyle(d.type as NodeType)

      const hitRadius = style.size / 2 + 6
      el.append('circle')
        .attr('r',  hitRadius)
        .attr('cx', 0).attr('cy', 0)
        .attr('fill',           'transparent')
        .attr('stroke',         'none')
        .attr('pointer-events', 'all')

      appendShape(el, style)

      el.append('text')
        .text(d.type === 'tag' ? formatTagDisplay(d.label) : d.label)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('x', style.textX)
        .attr('y', style.textY)
        .style('fill',        style.textColor)
        .style('font-size',   `${style.fontSize}px`)
        .style('font-family', 'var(--font-mplus), sans-serif')
        .style('font-weight', 600)
        .style('display', 'none')
        .attr('class',        style.labelClass)
        .attr('pointer-events', 'all')
        .attr('user-select',    'none')
    })

    nodeMapRef.current = new Map(nodes.map(n => [n.id, n]))
    buildAdjacency(nodes, edges)
    labelRef.current = nodeGroup.selectAll<SVGTextElement, GraphNode>('.entryLabel, .tagLabel') as any

    const savedTransform = zoomTransformRef.current
    if (savedTransform) {
      svg.call(zoomBehavior.transform, savedTransform)
    } else {
      const initialScale = 0.8
      const tx = width / 2 * (1 - initialScale)
      const ty = height / 2 * (1 - initialScale)
      svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(initialScale))
    }

    hoveredNodeIdRef.current = null
    applyFocusedLabelOffset(activeSlugRef.current)
    refreshLinkStyles()
    simulationRef.current?.alpha(1).restart()
  }, [graphData, dimensions, simPreset, refreshLinkStyles])

  // ── Global event listeners ──────────────────────────────────────────────────

  useEffect(() => {
    const onResetZoom = () => {
      if (!svgRef.current || !zoomBehaviorRef.current) return
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
      const initialScale = 0.8
      const tx = dimensionsRef.current.width / 2 * (1 - initialScale)
      const ty = dimensionsRef.current.height / 2 * (1 - initialScale)
      svg.transition().duration(200)
        .call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity.translate(tx, ty).scale(initialScale))
    }

    const onZoomToFit = () => {
      if (!svgRef.current || !zoomBehaviorRef.current || !graphNodesRef.current.length) return
      const w = dimensionsRef.current.width
      const h = dimensionsRef.current.height
      if (!w || !h) return

      const xs = graphNodesRef.current.map((n: any) => n.x ?? 0)
      const ys = graphNodesRef.current.map((n: any) => n.y ?? 0)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const dx = Math.max(1, maxX - minX)
      const dy = Math.max(1, maxY - minY)
      const scale = Math.max(0.8, Math.min(2.5, 0.9 / Math.max(dx / w, dy / h)))
      const tx = w / 2 - ((minX + maxX) / 2) * scale
      const ty = h / 2 - ((minY + maxY) / 2) * scale
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
      svg.transition().duration(250)
        .call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity.translate(tx, ty).scale(scale))
    }

    const onLogGraphData = () => {
      console.log('fbr:graph-data', graphDataRef.current)
      console.log('fbr:graph-debug-overlay', showDebugOverlay)
    }

    window.addEventListener('fbr:graph-reset-zoom', onResetZoom)
    window.addEventListener('fbr:graph-zoom-fit', onZoomToFit)
    window.addEventListener('fbr:graph-log-data', onLogGraphData)
    return () => {
      window.removeEventListener('fbr:graph-reset-zoom', onResetZoom)
      window.removeEventListener('fbr:graph-zoom-fit', onZoomToFit)
      window.removeEventListener('fbr:graph-log-data', onLogGraphData)
    }
  }, [showDebugOverlay])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%', display: 'block', background: COLORS.WHITE }}
      />
    </div>
  )
}
