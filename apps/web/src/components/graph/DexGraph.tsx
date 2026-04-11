// apps/web/src/components/graph/DexGraph.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useGraphSimulation } from './useGraphSimulation'
import { getNodeStyle, appendShape } from './graphUtils'
import { COLORS } from './graphConstants'
import { DURATION } from '@/lib/tokens'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/graph'
import { useLayoutStore, getFocusedSlug, getLeaves } from '@/components/desktop/useLayoutStore'
import { useMenuStore } from '@/components/desktop/useMenuStore'
import DitherOverlay from '@/components/DitherOverlay'

/** Below this zoom scale, all labels stay hidden. */
const LABEL_ZOOM_THRESHOLD = 1.0
/** Per-node multiplier range for staggered label animations. */
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

interface DexGraphProps {
  enableWindowOffset?: boolean
}

export default function DexGraph({ enableWindowOffset = true }: DexGraphProps) {
  const WINDOW_SHIFT_RATIO = 0.25
  const ENTER_OVERSHOOT_RATIO = 0.30
  const EXIT_OVERSHOOT_RATIO = -0.05
  const MID_MOVE_NUDGE_RATIO = 0.27
  const SETTLE_MS = 240
  const IMPULSE_MS = 360

  const svgRef           = useRef<SVGSVGElement>(null)
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null)
  const linkRef          = useRef<d3.Selection<SVGLineElement, GraphEdge, SVGGElement, unknown> | null>(null)
  const nodeRef          = useRef<d3.Selection<SVGGElement,    GraphNode, SVGGElement, unknown> | null>(null)
  const [graphData,   setGraphData]   = useState<GraphData | null>(null)
  const [dimensions,  setDimensions]  = useState({ width: 0, height: 0 })
  const zoomScaleRef     = useRef(1)
  const openPost         = useLayoutStore((s) => s.openPost)
  const splitOpen        = useLayoutStore((s) => s.splitOpen)
  const focusedId        = useLayoutStore((s) => s.focusedId)
  const windowCount      = useLayoutStore((s) => getLeaves(s.root).length)
  const activeSlug       = useLayoutStore(getFocusedSlug)
  const simPreset        = useMenuStore((s) => s.simPreset)
  const showDebugOverlay = useMenuStore((s) => s.showDebugOverlay)
  const activeSlugRef    = useRef<string | null>(focusedId ? activeSlug : null)
  const pulseGroupRef    = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const graphDataRef     = useRef<GraphData | null>(null)
  const rafRef           = useRef<number | null>(null)
  const labelRef         = useRef<d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null>(null)
  const zoomBehaviorRef  = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodeMapRef       = useRef<Map<string, GraphNode>>(new Map())
  const graphNodesRef    = useRef<GraphNode[]>([])
  const dimensionsRef    = useRef({ width: 0, height: 0 })
  const prevWindowCountRef = useRef<number | null>(null)
  const lastSettledTargetRef = useRef<number | null>(null)
  const settleTimerRef     = useRef<number | null>(null)
  const impulseTimerRef    = useRef<number | null>(null)

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

  const { simulationRef, forceXRef } = useGraphSimulation({
    nodes:  graphData?.nodes ?? [],
    edges:  graphData?.edges ?? [],
    width:  dimensions.width,
    height: dimensions.height,
    onTick: ticked,
    simPreset,
  })

  // ── Track active slug + reposition pulse orb immediately on slug change ────

  useEffect(() => {
    const selectedSlug = focusedId ? activeSlug : null
    activeSlugRef.current = selectedSlug
    const node = selectedSlug ? (nodeMapRef.current.get(selectedSlug) as any) : null
    if (node?.x !== undefined && pulseGroupRef.current) {
      pulseGroupRef.current.attr('transform', `translate(${node.x},${node.y})`)
    } else if (pulseGroupRef.current) {
      pulseGroupRef.current.attr('transform', 'translate(-9999,-9999)')
    }
    simulationRef.current?.alpha(0.1).restart()
  }, [activeSlug, focusedId, simulationRef])

  // ── Desktop graph offset helper (animated for lively motion) ───────────────

  useEffect(() => {
    if (!enableWindowOffset || !dimensions.width) return
    const sim = simulationRef.current
    const forceX = forceXRef.current
    if (!sim || !forceX) return

    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    if (impulseTimerRef.current) window.clearTimeout(impulseTimerRef.current)

    const viewportCenterX = dimensions.width / 2
    const transform = zoomTransformRef.current ?? d3.zoomIdentity
    const zoomK = Math.max(transform.k || 1, 0.0001)
    const panX = transform.x
    const screenToWorldX = (screenX: number) => (screenX - panX) / zoomK

    const settledScreenTargetX = viewportCenterX + (windowCount > 0 ? dimensions.width * WINDOW_SHIFT_RATIO : 0)
    const prevWindowCount = prevWindowCountRef.current

    const wasEmpty = (prevWindowCount ?? 0) === 0
    const isEmpty = windowCount === 0
    const enteringFirstWindow = wasEmpty && !isEmpty
    const exitingLastWindow = !wasEmpty && isEmpty

    const transitionScreenTargetX = enteringFirstWindow
      ? viewportCenterX + dimensions.width * ENTER_OVERSHOOT_RATIO
      : exitingLastWindow
        ? viewportCenterX + dimensions.width * EXIT_OVERSHOOT_RATIO
        : (windowCount > 0 && (prevWindowCount ?? 0) > 0)
          ? viewportCenterX + dimensions.width * MID_MOVE_NUDGE_RATIO
          : settledScreenTargetX

    const transitionTargetX = screenToWorldX(transitionScreenTargetX)
    const settledTargetX = screenToWorldX(settledScreenTargetX)

    const originalDecay = sim.velocityDecay()
    sim.velocityDecay(0.32)

    if (lastSettledTargetRef.current !== null && Math.abs(lastSettledTargetRef.current - settledTargetX) < 0.5) {
      sim.velocityDecay(originalDecay)
      prevWindowCountRef.current = windowCount
      return
    }

    forceX.x(transitionTargetX)
    sim.alpha(0.55).alphaTarget(0.08).restart()

    impulseTimerRef.current = window.setTimeout(() => {
      sim.alphaTarget(0)
      sim.velocityDecay(originalDecay)
      impulseTimerRef.current = null
    }, IMPULSE_MS)

    settleTimerRef.current = window.setTimeout(() => {
      const nextForceX = forceXRef.current
      const nextSim = simulationRef.current
      if (!nextForceX || !nextSim) return
      nextForceX.x(settledTargetX)
      nextSim.alpha(0.28).restart()
      lastSettledTargetRef.current = settledTargetX
      settleTimerRef.current = null
    }, SETTLE_MS)

    prevWindowCountRef.current = windowCount
  }, [enableWindowOffset, windowCount, dimensions.width, graphData, simPreset, simulationRef, forceXRef])

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
      if (impulseTimerRef.current) window.clearTimeout(impulseTimerRef.current)
    }
  }, [])

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
        0%   { transform: scale(1);   opacity: 0.22; }
        60%  { opacity: 0.10; }
        100% { transform: scale(2.8); opacity: 0;    }
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
        .attr('stroke', COLORS.MIDLIGHT)
        .attr('stroke-width', 0.6)
        .attr('class', i === 1 ? 'orb-ring' : `orb-ring orb-ring-${i}`)
    })
    pulseGroupRef.current = pulseLayer

    const linkGroup = root.append('g').attr('class', 'links')
    const nodeGroup = root.append('g').attr('class', 'nodes')

    // ── Zoom ─────────────────────────────────────────────────────────────────

    const setLabelVisibility = (k: number) => {
      labelRef.current
        ?.style('opacity', k < LABEL_ZOOM_THRESHOLD ? 0 : 1)
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
        linkRef.current
          ?.attr('stroke', COLORS.LIGHT)
          .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
          .attr('stroke', COLORS.MID)
      })
      .on('mouseleave', () => {
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

    nodeRef.current?.each(function(d) {
      const el    = d3.select<SVGGElement, GraphNode>(this as SVGGElement)
      const style = getNodeStyle(d.type as any, d.weight)

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
        .style('transition',  `opacity ${randomDurationSeconds(0.2, d.id)} ease`)
        .attr('class',        style.labelClass)
        .attr('pointer-events', 'all')
        .attr('user-select',    'none')
    })

    nodeMapRef.current = new Map(nodes.map(n => [n.id, n]))
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

    simulationRef.current?.alpha(1).restart()
  }, [graphData, dimensions, simPreset])

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
        style={{ width: '100%', height: '100%', display: 'block', background: COLORS.OFFWHITE }}
      />
      <DitherOverlay position="absolute" zIndex={2} strategy="screen" />
    </div>
  )
}
