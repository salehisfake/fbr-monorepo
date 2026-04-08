// apps/web/src/components/graph/useGraphSimulation.ts

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { getNodeSize } from './graphUtils'
import type { GraphNode, GraphEdge } from '@/lib/graph'
import type { SimPreset } from '@/components/desktop/useMenuStore'

type SimNode = GraphNode & d3.SimulationNodeDatum
type SimEdge = GraphEdge & d3.SimulationLinkDatum<SimNode>

interface Props {
  nodes:  GraphNode[]
  edges:  GraphEdge[]
  width:  number
  height: number
  onTick: () => void
  simPreset: SimPreset
}

const SIM_PRESET_CONFIG: Record<SimPreset, { linkDistance: number; linkStrength: number; charge: number; collidePadding: number }> = {
  calm: { linkDistance: 76, linkStrength: 0.35, charge: -220, collidePadding: 9 },
  balanced: { linkDistance: 60, linkStrength: 0.5, charge: -300, collidePadding: 6 },
  dynamic: { linkDistance: 50, linkStrength: 0.75, charge: -380, collidePadding: 4 },
}

export function useGraphSimulation({ nodes, edges, width, height, onTick, simPreset }: Props) {
  const simulationRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null)

  useEffect(() => {
    if (!width || !height || !nodes.length) return
    const preset = SIM_PRESET_CONFIG[simPreset]

    const simNodes = nodes as SimNode[]
    const simEdges = edges as SimEdge[]

    const sim = d3.forceSimulation<SimNode>(simNodes)
      .force('link',
        d3.forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(preset.linkDistance)
          .strength(preset.linkStrength)
      )
      .force('charge', d3.forceManyBody().strength(preset.charge))
      .force('collide',
        d3.forceCollide<SimNode>()
          .radius((d) => getNodeSize(d.weight) / 2 + preset.collidePadding)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', onTick as () => void)

    simulationRef.current = sim
    return () => { sim.stop() }
  }, [nodes, edges, width, height, onTick, simPreset])

  return simulationRef
}