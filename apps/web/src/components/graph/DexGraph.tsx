// apps/web/src/components/graph/DexGraph.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useGraphSimulation } from './useGraphSimulation'
import { getNodeStyle, appendShape } from './graphUtils'
import { COLORS } from './graphConstants'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/graph'
import { useLayoutStore, getFocusedSlug } from '@/components/desktop/useLayoutStore'
import { useMenuStore } from '@/components/desktop/useMenuStore'
import DitherOverlay from '@/components/DitherOverlay'
import {
  buildAdjacency,
  buildHopMapFromSeeds,
  collectForcedIds,
  priorityScore,
  selectVisibleLabelIds,
} from './labelCulling'

/** Below this zoom scale, all labels stay hidden (unchanged). */
const LABEL_ZOOM_THRESHOLD = 1.0
/** Focused/forced labels can appear slightly earlier than the general pool. */
const FOCUS_LABEL_ZOOM_THRESHOLD = 0.9
/** By this zoom, focus-hop reveal reaches final “show all labels” step. */
const HOP_REVEAL_END_ZOOM = 2
/** Medium randomness: per-node multiplier in [0.6, 1.4] (±40%). */
const TRANSITION_RANDOM_MIN = 0.05
const TRANSITION_RANDOM_MAX = 1.4
/** Global multiplier for all label reveal timings. */
const LABEL_REVEAL_SPEED_MULTIPLIER = 5

/**
 * Deterministic per-node pseudo-random in [0,1].
 * Uses a tiny FNV-1a style hash so the same id always yields the same value.
 */
function stableNodeRandom01(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function randomDurationSeconds(baseSec: number, nodeId: string): string {
  const t = stableNodeRandom01(nodeId)
  const m = TRANSITION_RANDOM_MIN + (TRANSITION_RANDOM_MAX - TRANSITION_RANDOM_MIN) * t
  return `${(baseSec * m * LABEL_REVEAL_SPEED_MULTIPLIER).toFixed(3)}s`
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DexGraph() {
  const svgRef           = useRef<SVGSVGElement>(null)
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null)
  const linkRef          = useRef<d3.Selection<SVGLineElement, GraphEdge, SVGGElement, unknown> | null>(null)
  const nodeRef          = useRef<d3.Selection<SVGGElement,    GraphNode, SVGGElement, unknown> | null>(null)
  const [graphData,   setGraphData]   = useState<GraphData | null>(null)
  const [dimensions,  setDimensions]  = useState({ width: 0, height: 0 })
  const zoomScaleRef  = useRef(1)
  const openPost        = useLayoutStore((s) => s.openPost)
  const splitOpen       = useLayoutStore((s) => s.splitOpen)
  const activeSlug      = useLayoutStore(getFocusedSlug)
  const setPanelVisible = useLayoutStore((s) => s.setPanelVisible)
  const labelMode       = useMenuStore((s) => s.labelMode)
  const simPreset       = useMenuStore((s) => s.simPreset)
  const showDebugOverlay = useMenuStore((s) => s.showDebugOverlay)
  const activeSlugRef = useRef<string>(activeSlug)
  const pulseGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const graphDataRef  = useRef<GraphData | null>(null)
  const rafRef        = useRef<number | null>(null)
  const labelRef      = useRef<d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodeMapRef    = useRef<Map<string, GraphNode>>(new Map())
  const graphNodesRef = useRef<GraphNode[]>([])
  const adjacencyRef  = useRef<Map<string, Set<string>>>(new Map())
  const hoveredNodeIdRef = useRef<string | null>(null)
  const dimensionsRef = useRef({ width: 0, height: 0 })
  const hopCacheKeyRef = useRef('')
  const hopCacheMapRef = useRef<Map<string, number> | null>(null)
  /** Set in draw effect — tick + zoom call this to refresh label culling. */
  const scheduleLabelCullingRef = useRef<() => void>(() => {})
  const lastCullAtRef = useRef(0)
  const cullingRafRef = useRef<number | null>(null)

// ── Sync graphData ref ──────────────────────────────────────────────────────

  useEffect(() => { graphDataRef.current = graphData }, [graphData])

  useEffect(() => {
    dimensionsRef.current = dimensions
  }, [dimensions])

  // ── Track active slug + reposition pulse orb immediately on slug change ───

  useEffect(() => {
    activeSlugRef.current = activeSlug

    const node = nodeMapRef.current.get(activeSlug) as any
    if (node?.x !== undefined && pulseGroupRef.current) {
      pulseGroupRef.current.attr('transform', `translate(${node.x},${node.y})`)
    }
    // Briefly wake the simulation so ticked fires and confirms position
    simulationRef.current?.alpha(0.1).restart()
    scheduleLabelCullingRef.current()
  }, [activeSlug])

// parralax
  function getNodeTransform(d: any, k: number): string {
    const multiplier = d.type === 'tag'
      ? 1 + (k - 1) * (0.01 + Math.min(d.weight * 0.01, 0.05))
       : 1 + (k - 1) * -0.1
    return `translate(${d.x},${d.y}) scale(${multiplier})`
    }

  // ── Tick ───────────────────────────────────────────────────────────────────

const ticked = useCallback(() => {
  linkRef.current
    ?.attr('x1', (d: any) => d.source.x)
     .attr('y1', (d: any) => d.source.y)
     .attr('x2', (d: any) => d.target.x)
     .attr('y2', (d: any) => d.target.y)

  nodeRef.current
    ?.attr('transform', (d: any) =>
      getNodeTransform(d, zoomScaleRef.current)
    )

  // Keep pulse orb centred on the active node
  const activeNode = nodeMapRef.current.get(activeSlugRef.current) as any
  if (activeNode?.x !== undefined && pulseGroupRef.current) {
    pulseGroupRef.current.attr('transform', `translate(${activeNode.x},${activeNode.y})`)
  }

  scheduleLabelCullingRef.current()
}, [])

  const simulationRef = useGraphSimulation({
    nodes:  graphData?.nodes ?? [],
    edges:  graphData?.edges ?? [],
    width:  dimensions.width,
    height: dimensions.height,
    onTick: ticked,
    simPreset,
  })

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/graph.json')
      .then(r => r.json())
      .then((data: GraphData) => setGraphData(data))
      .catch(console.error)
  }, [])

  // ── Resize observer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!svgRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDimensions({ width, height })
    })
    ro.observe(svgRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Draw ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!svgRef.current || !graphData || !dimensions.width) return
    const nodes = [
      ...graphData.nodes.filter(n => n.type === 'entry'),
      ...graphData.nodes.filter(n => n.type === 'tag'),
    ]
    const edges = graphData.edges
    graphNodesRef.current = nodes
    adjacencyRef.current = buildAdjacency(edges)
    hopCacheKeyRef.current = ''
    hopCacheMapRef.current = null
    dimensionsRef.current = dimensions
    const { width, height } = dimensions

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
    svg.selectAll('*').remove()

    // ── Pulse-orb animation ────────────────────────────────────────────────
    // Three concentric rings emanate outward from the active node.
    // The dither texture comes for free — the site-wide DitherOverlay already
    // composites its color-burn pattern over every pixel of the viewport.

    svg.append('style').text(`
      @keyframes orb-ripple {
        0%   { transform: scale(1);   opacity: 0.22; }
        60%  { opacity: 0.10; }
        100% { transform: scale(2.8); opacity: 0;    }
      }
      .orb-ring {
        animation: orb-ripple 3.8s ease-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      .orb-ring-2 { animation-delay: 1.27s; }
      .orb-ring-3 { animation-delay: 2.53s; }
    `)

    const root = svg.append('g')

    // Layer order (bottom → top): pulse → links → nodes
    const pulseLayer = root.append('g').attr('class', 'pulse-layer')
      .attr('transform', 'translate(-9999,-9999)')  // offscreen until first tick
    ;[1, 2, 3].forEach(i => {
      pulseLayer.append('rect')
        .attr('x', -5).attr('y', -5)
        .attr('width', 10).attr('height', 10)
        .attr('rx', 0)
        .attr('fill', 'none')
        .attr('stroke', COLORS.MIDLIGHT)
        .attr('stroke-width', 0.6)
        .attr('class', i === 1 ? 'orb-ring' : `orb-ring orb-ring-${i}`)
    })
    pulseGroupRef.current = pulseLayer

    const linkGroup = root.append('g').attr('class', 'links')
    const nodeGroup = root.append('g').attr('class', 'nodes')

    // ── Zoom ─────────────────────────────────────────────────────────────────

    const runLabelCulling = () => {
      const sel = labelRef.current
      if (!sel || sel.empty()) return

      const k = zoomScaleRef.current
      if (k < FOCUS_LABEL_ZOOM_THRESHOLD) {
        sel.style('opacity', 0)
        return
      }

      const alpha = simulationRef.current?.alpha() ?? 0
      const now = performance.now()
      const minGap = alpha > 0.04 ? 90 : 0
      if (now - lastCullAtRef.current < minGap) return
      lastCullAtRef.current = now

      const { width: w, height: h } = dimensionsRef.current
      if (!w) return

      const nodeList = graphNodesRef.current
      if (!nodeList.length) return

      if (labelMode === 'all') {
        sel
          .style('transition', (d: GraphNode) => `opacity ${randomDurationSeconds(0.16, d.id)} ease`)
          .style('opacity', 1)
        return
      }

      const t = zoomTransformRef.current ?? d3.zoomIdentity
      const [cx, cy] = t.invert([w / 2, h / 2])

      const activeId = activeSlugRef.current
      const hoveredId = hoveredNodeIdRef.current
      const focusSeeds = new Set<string>()
      if (activeId) focusSeeds.add(activeId)

      // Focused/selected mode: reveal labels hop-by-hop from selected nodes.
      if (focusSeeds.size > 0) {
        const focusKey = Array.from(focusSeeds).sort().join('|')
        let hopMap = hopCacheMapRef.current
        if (!hopMap || hopCacheKeyRef.current !== focusKey) {
          hopMap = buildHopMapFromSeeds(adjacencyRef.current, focusSeeds)
          hopCacheMapRef.current = hopMap
          hopCacheKeyRef.current = focusKey
        }
        const connectedMaxHop =
          hopMap.size > 0 ? Math.max(...Array.from(hopMap.values())) : 0
        const totalSteps = connectedMaxHop + 2
        const p = Math.max(
          0,
          Math.min(
            1,
            (k - FOCUS_LABEL_ZOOM_THRESHOLD) /
              Math.max(0.001, HOP_REVEAL_END_ZOOM - FOCUS_LABEL_ZOOM_THRESHOLD),
          ),
        )
        const stepIndex = Math.floor(p * (totalSteps - 1))
        const isFinalStep = stepIndex >= totalSteps - 1

        const visible = new Set<string>()
        if (isFinalStep) {
          nodeList.forEach((n) => visible.add(n.id))
        } else {
          hopMap.forEach((hop, id) => {
            if (hop <= stepIndex) visible.add(id)
          })
          // Always include seeds even if disconnected/missing from adjacency map.
          focusSeeds.forEach((id) => visible.add(id))
        }

        // Hover reveal is strictly one-hop only: hovered node + direct neighbors.
        // It should never become an additional hop seed.
        if (hoveredId) {
          visible.add(hoveredId)
          adjacencyRef.current.get(hoveredId)?.forEach((n) => visible.add(n))
        }

        sel
          .style('transition', (d: GraphNode) =>
            focusSeeds.has(d.id)
              ? `opacity ${randomDurationSeconds(0.11, d.id)} ease`
              : `opacity ${randomDurationSeconds(0.22, d.id)} ease`
          )
          .style('opacity', (d: GraphNode) => (visible.has(d.id) ? 1 : 0))
        return
      }

      // No focus selected: use viewport-priority + overlap culling.
      const forced = collectForcedIds(activeId, hoveredId, adjacencyRef.current)

      if (k < LABEL_ZOOM_THRESHOLD) {
        sel
          .style('transition', (d: GraphNode) =>
            forced.has(d.id)
              ? `opacity ${randomDurationSeconds(0.12, d.id)} ease`
              : `opacity ${randomDurationSeconds(0.26, d.id)} ease`
          )
          .style('opacity', (d: GraphNode) => (forced.has(d.id) ? 1 : 0))
        return
      }

      const maxNonForced = Math.min(
        48,
        8 + Math.floor((k - LABEL_ZOOM_THRESHOLD) * 28),
      )
      const rects = new Map<string, DOMRect>()
      sel.each(function (d: GraphNode) {
        rects.set(d.id, (this as SVGTextElement).getBoundingClientRect())
      })
      const visible = selectVisibleLabelIds(
        nodeList,
        rects,
        forced,
        (d) => priorityScore(d, cx, cy),
        maxNonForced,
        6,
      )
      sel
        .style('transition', (d: GraphNode) =>
          forced.has(d.id)
            ? `opacity ${randomDurationSeconds(0.12, d.id)} ease`
            : `opacity ${randomDurationSeconds(0.24, d.id)} ease 0.08s`
        )
        .style('opacity', (d: GraphNode) => (visible.has(d.id) ? 1 : 0))
    }

    const scheduleLabelCulling = () => {
      if (cullingRafRef.current != null) return
      cullingRafRef.current = window.requestAnimationFrame(() => {
        cullingRafRef.current = null
        runLabelCulling()
      })
    }
    scheduleLabelCullingRef.current = scheduleLabelCulling

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 5])
      .interpolate(d3.interpolateZoom)
      .duration(200)
      .on('zoom', (event) => {
        zoomTransformRef.current = event.transform
        root.attr('transform', event.transform)

        const k = event.transform.k
        zoomScaleRef.current = k

        // Throttle node transform updates to once per animation frame
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          nodeRef.current?.attr('transform', (d: any) => getNodeTransform(d, k))
          rafRef.current = null
        })

        // Focused labels can appear first, then the general pool after threshold.
        if (k < FOCUS_LABEL_ZOOM_THRESHOLD) {
          labelRef.current?.style('opacity', 0)
        } else {
          scheduleLabelCulling()
        }
        setPanelVisible(k >= LABEL_ZOOM_THRESHOLD)
      })
    zoomBehaviorRef.current = zoomBehavior

    svg.call(zoomBehavior)

    // ── Links ─────────────────────────────────────────────────────────────────

    linkRef.current = linkGroup
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(edges)
      .join('line')
            .attr('stroke', COLORS.LIGHT)
            .attr('stroke-width', 0.5)
            .attr('stroke-opacity', 0.7)
            .attr('stroke-dasharray', 'none')
            .attr('vector-effect', 'none') as any

    // ── Nodes ─────────────────────────────────────────────────────────────────

    nodeRef.current = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('mouseover', (_e, d) => {
        hoveredNodeIdRef.current = d.id
        scheduleLabelCulling()
        linkRef.current
          ?.attr('stroke', COLORS.LIGHT)
          .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
          .attr('stroke', COLORS.MID)
      })
      .on('mouseleave', () => {
        hoveredNodeIdRef.current = null
        scheduleLabelCulling()
        linkRef.current?.attr('stroke', COLORS.LIGHT)
      })
      .on('click', (event, d) => {
        if (d.url) {
          if ((event as MouseEvent).shiftKey) {
            splitOpen(d.id)
          } else {
            openPost(d.id)
          }
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

    // Render each node's shape and label
    nodeRef.current?.each(function(d) {
      const el    = d3.select<SVGGElement, GraphNode>(this as SVGGElement)
      const style = getNodeStyle(d.type as any, d.weight)

      // Invisible hit-area disc matching the physics collision field.
      // fill:'transparent' (not 'none') is required so the interior captures
      // pointer events, giving the interaction the same radius as the simulation.
      const hitRadius = style.size / 2 + 6
      el.append('circle')
        .attr('r',  hitRadius)
        .attr('cx', 0).attr('cy', 0)
        .attr('fill',           'transparent')
        .attr('stroke',         'none')
        .attr('pointer-events', 'all')

      appendShape(el, style)

      el.append('text')
        .text(d.label)
        .attr('text-anchor', 'middle')
        .attr('x', style.textX)
        .attr('y', style.textY)
        .style('fill',        style.textColor)
        .style('font-size',   `${style.fontSize}px`)
        .style('font-family', 'var(--font-mplus), sans-serif')
        .style('font-weight', 400)
        .style('opacity',     0)
        .style('transition',  (d: GraphNode) => `opacity ${randomDurationSeconds(0.2, d.id)} ease`)
        .attr('class',        style.labelClass)
        .attr('pointer-events', 'all')
        .attr('user-select',    'none')
    })

    // Build node lookup map — O(1) access in ticked() and slug effect
    nodeMapRef.current = new Map(nodes.map(n => [n.id, n]))

    // Cache label selection — avoids live DOM query in zoom handler every frame
    labelRef.current = nodeGroup.selectAll<SVGTextElement, GraphNode>('.entryLabel, .tagLabel') as any

    // Apply zoom only after labels exist so the first zoom event can run culling.
    const savedTransform = zoomTransformRef.current
    if (savedTransform) {
      svg.call(zoomBehavior.transform, savedTransform)
    } else {
      const initialScale = 0.8
      const tx = width / 2 * (1 - initialScale)
      const ty = height / 2 * (1 - initialScale)
      svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(initialScale))
    }

    simulationRef.current?.alpha(1).restart()

    scheduleLabelCulling()

    return () => {
      scheduleLabelCullingRef.current = () => {}
      if (cullingRafRef.current != null) {
        cancelAnimationFrame(cullingRafRef.current)
        cullingRafRef.current = null
      }
    }
  }, [graphData, dimensions, labelMode, simPreset])

  useEffect(() => {
    const onResetZoom = () => {
      if (!svgRef.current || !zoomBehaviorRef.current) return
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
      const initialScale = 0.8
      const tx = dimensionsRef.current.width / 2 * (1 - initialScale)
      const ty = dimensionsRef.current.height / 2 * (1 - initialScale)
      svg
        .transition()
        .duration(200)
        .call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity.translate(tx, ty).scale(initialScale))
    }

    const onZoomToFit = () => {
      if (!svgRef.current || !zoomBehaviorRef.current || !graphNodesRef.current.length) return
      const w = dimensionsRef.current.width
      const h = dimensionsRef.current.height
      if (!w || !h) return

      const xs = graphNodesRef.current.map((n: any) => n.x ?? 0)
      const ys = graphNodesRef.current.map((n: any) => n.y ?? 0)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const dx = Math.max(1, maxX - minX)
      const dy = Math.max(1, maxY - minY)
      const scale = Math.max(0.8, Math.min(2.5, 0.9 / Math.max(dx / w, dy / h)))
      const tx = w / 2 - ((minX + maxX) / 2) * scale
      const ty = h / 2 - ((minY + maxY) / 2) * scale
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
      svg
        .transition()
        .duration(250)
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
        style={{ width: '100%', height: '100%', display: 'block', background: COLORS.OFFWHITE }}
      />

      {/* Scoped dither overlay — affects graph pixels only */}
      <DitherOverlay position="absolute" zIndex={2} strategy="screen" />
    </div>
  )
}