// apps/web/src/components/graph/useGraphSimulation.ts

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { COLLISION_RADIUS_MAP } from './graphConstants'
import type { GraphNode, GraphEdge } from '@/lib/graph'

interface Props {
  nodes:  GraphNode[]
  edges:  GraphEdge[]
  width:  number
  height: number
  onTick: () => void
}

export function useGraphSimulation({ nodes, edges, width, height, onTick }: Props) {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)

  useEffect(() => {
    if (!width || !height || !nodes.length) return

    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force('link',
        d3.forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance(60)
          .strength(0.5)
      )
       .force('charge', d3.forceManyBody().strength(-300).distanceMax(400))
      .force('collide',
        d3.forceCollide<GraphNode>()
          .radius((d) => COLLISION_RADIUS_MAP[d.type] ?? COLLISION_RADIUS_MAP.default)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', onTick)

    simulationRef.current = sim
    return () => { sim.stop() }
  }, [nodes, edges, width, height])

  return simulationRef
}