// apps/web/src/components/graph/graphUtils.ts

import { COLORS } from './graphConstants'

export type NodeType = 'entry' | 'tag'

export interface NodeStyle {
  size:        number
  shape:       'circle' | 'rect'
  fill:        string
  stroke:      string
  strokeWidth: number
  fontSize:    number
  textColor:   string
  textX:       number
  textY:       number
  labelClass:  string
  // Swap to 'image' per node type when ready
  iconMode:    'shape' | 'image'
  iconPath?:   string
}

/**
 * Returns the visual half-size of a node in SVG units.
 * Uses a sqrt scale so weight differences are visible without extreme
 * size variance — accumulated weights can reach 50+.
 */
export function getNodeSize(weight: number): number {
  return 4 + Math.sqrt(weight) * 2.5
}

export function getNodeStyle(type: NodeType, weight: number): NodeStyle {
  const size = getNodeSize(weight)

  switch (type) {
    case 'tag':
      return {
        size,
        shape:       'rect',
        fill:        COLORS.BLACK,
        stroke:      COLORS.BLACK,
        strokeWidth: 0,
        fontSize:    9,
        textColor:   COLORS.BLACK,
        textX:       0,
        textY:       size / 2 + 12,
        labelClass:  'tagLabel',
        iconMode:    'shape',
      }
    case 'entry':
    default:
      return {
        size,
        shape:       'rect',
        fill:        COLORS.BLACK,
        stroke:      COLORS.BLACK,
        strokeWidth: 0,
        fontSize:    8,
        textColor:   COLORS.BLACK,
        textX:       0,
        textY:       size / 2 + 12,
        labelClass:  'entryLabel',
        iconMode:    'shape',
      }
  }
}

export function appendShape(
  el: d3.Selection<SVGGElement, any, any, any>,
  style: NodeStyle
) {
  if (style.iconMode === 'image' && style.iconPath) {
    el.append('image')
      .attr('class', 'nodeIcon')
      .attr('href', style.iconPath)
      .attr('width',  style.size)
      .attr('height', style.size)
      .attr('x', -style.size / 2)
      .attr('y', -style.size / 2)
    return
  }

  const s = style.size
  switch (style.shape) {
    case 'circle':
      el.append('circle')
        .attr('class', 'nodeIcon')
        .attr('r', s / 2)
        .attr('fill',         style.fill)
        .attr('stroke',       style.stroke)
        .attr('stroke-width', style.strokeWidth)
        .attr('vector-effect', 'non-scaling-stroke')
      break
    case 'rect':
      el.append('rect')
        .attr('class', 'nodeIcon')
        .attr('width',  s)
        .attr('height', s)
        .attr('x', -s / 2)
        .attr('y', -s / 2)
        .attr('rx', 0.1)  // adjust to taste
        .attr('fill',         style.fill)
        .attr('stroke',       style.stroke)
        .attr('stroke-width', style.strokeWidth)
        .attr('vector-effect', 'non-scaling-stroke')
      break
  }
}