// apps/web/src/components/graph/DexGraph.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useGraphSimulation } from './useGraphSimulation'
import { getNodeStyle, appendShape } from './graphUtils'
import { COLORS } from './graphConstants'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/graph'
import { getTagConfig } from '@/config/graph'
import { useWindowStore } from '@/components/desktop/useWindowStore'


// ─────────────────────────────────────────────────────────────────────────────

export default function DexGraph() {
  const svgRef           = useRef<SVGSVGElement>(null)
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null)
  const linkRef          = useRef<d3.Selection<SVGLineElement, GraphEdge, SVGGElement, unknown> | null>(null)
  const nodeRef          = useRef<d3.Selection<SVGGElement,    GraphNode, SVGGElement, unknown> | null>(null)
  const [graphData,   setGraphData]   = useState<GraphData | null>(null)
  const [dimensions,  setDimensions]  = useState({ width: 0, height: 0 })
  const zoomScaleRef = useRef(1)
  const openWindow = useWindowStore((s) => s.openWindow)
  const rafRef = useRef<number | null>(null)

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
}, [])

  const simulationRef = useGraphSimulation({
    nodes:  graphData?.nodes ?? [],
    edges:  graphData?.edges ?? [],
    width:  dimensions.width,
    height: dimensions.height,
    onTick: ticked,
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
    const isParentTag = (n: GraphNode) => n.type === 'tag' && !!getTagConfig(n.label)
    const nodes = [
      ...graphData.nodes.filter(n => n.type === 'entry'),
      ...graphData.nodes.filter(n => n.type === 'tag' && !isParentTag(n)),
      ...graphData.nodes.filter(n => isParentTag(n)),
    ]
    const edges = graphData.edges
    const { width, height } = dimensions

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
    svg.selectAll('*').remove()

    const root = svg.append('g')
    if (zoomTransformRef.current) {
      root.attr('transform', zoomTransformRef.current.toString())
    }

    const linkGroup = root.append('g').attr('class', 'links')
    const nodeGroup = root.append('g').attr('class', 'nodes')

    // ── Zoom ─────────────────────────────────────────────────────────────────


    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
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

          svg.selectAll('.entryLabel')
            .transition().duration(200)
            .style('opacity', k > 1.5 ? Math.min((k - 1.5) * 2, 1) : 0)
          svg.selectAll('.tagLabel')
            .transition().duration(200)
            .style('opacity', Math.min(k * 0.8, 1))
        })
    )
    

    // ── Links ─────────────────────────────────────────────────────────────────

    linkRef.current = linkGroup
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(edges)
      .join('line')
            .attr('stroke', COLORS.LIGHT)
            .attr('stroke-width', (d: any) => {
              if (d.source.type === 'tag' && d.target.type === 'tag') return 0.5
              if (d.source.type === 'tag' || d.target.type === 'tag') return 0.5
              return 0.4
            })
            .attr('stroke-opacity', (d: any) => {
              if (d.source.type === 'tag' && d.target.type === 'tag') return 1
              if (d.source.type === 'tag' || d.target.type === 'tag') return 0.7
              return 0.15
            })
            .attr('stroke-dasharray', (d: any) => {
              if (d.source.type === 'tag' && d.target.type === 'tag') return 'none'
              if (d.source.type === 'tag' || d.target.type === 'tag') return 'none'
              return '1,4'
            })
            .attr('vector-effect', (d: any) => {
              // Hierarchy links stay crisp at all zoom levels
              // Entry links scale naturally with zoom — fades into background when zoomed out
              if (d.source.type === 'tag' && d.target.type === 'tag') return 'none'
              return 'none'
            }) as any

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
      .on('click', (_e, d) => {
        if (d.url) {
          const [x, y] = d3.pointer(event, document.body)
          openWindow({
            type:  'post',
            slug:  d.id,
            title: d.label,
            originX: x,
            originY: y
          })
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
    nodeRef.current.each(function(d) {
      const el    = d3.select<SVGGElement, GraphNode>(this as SVGGElement)
      const style = getNodeStyle(d.type as any, d.weight, d.label)

      appendShape(el, style)

      el.append('text')
        .text(d.label)
        .attr('text-anchor', 'middle')
        .attr('x', style.textX)
        .attr('y', style.textY)
        .style('fill',      style.textColor)
        .style('font-size', `${style.fontSize}px`)
        .style('font-family', 'var(--font-mplus), sans-serif')
        .style('font-weight', d.type === 'entry' ? 500 : 600)
        .style('opacity',   d.type === 'entry' ? 0 : 1)
        .attr('class',      style.labelClass)
        .attr('pointer-events', 'none')
        .attr('user-select',    'none')
    })

    simulationRef.current?.alpha(1).restart()

  }, [graphData, dimensions])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block', background: COLORS.OFFWHITE }}
    />
  )
}