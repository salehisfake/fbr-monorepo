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

interface PresetConfig {
  linkDistance: number
  charge:      number
  chargeMax:   number
  centering:   number
  velocityDecay: number
  alphaDecay:    number
}

const SIM_PRESET_CONFIG: Record<SimPreset, PresetConfig> = {
  calm: {
    linkDistance:   150,
    charge:        -300,
    chargeMax:     520,
    centering:     0.022,
    velocityDecay: 0.44,
    alphaDecay:    0.018,
  },
  balanced: {
    linkDistance:   128,
    charge:        -360,
    chargeMax:     620,
    centering:     0.03,
    velocityDecay: 0.38,
    alphaDecay:    0.022,
  },
  dynamic: {
    linkDistance:   108,
    charge:        -430,
    chargeMax:     720,
    centering:     0.042,
    velocityDecay: 0.30,
    alphaDecay:    0.028,
  },
}

function estimateNodeRadius(): number {
  return getNodeSize() / 2
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
      )
      .force('charge',
        d3.forceManyBody<SimNode>()
          .strength(preset.charge)
          .distanceMax(preset.chargeMax)
      )
      .force('collide',
        d3.forceCollide<SimNode>()
          .radius(() => estimateNodeRadius() + 4)
          .iterations(1)
      )
      .force('x', d3.forceX<SimNode>(width / 2).strength(preset.centering))
      .force('y', d3.forceY<SimNode>(height / 2).strength(preset.centering))
      .velocityDecay(preset.velocityDecay)
      .alphaDecay(preset.alphaDecay)
      .on('tick', onTick as () => void)

    simulationRef.current = sim
    return () => { sim.stop() }
  }, [nodes, edges, width, height, onTick, simPreset])

  return { simulationRef }
}
