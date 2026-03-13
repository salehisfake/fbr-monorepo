// apps/web/src/components/graph/graphUtils.ts

import { COLORS } from './graphConstants'
import { getTagConfig } from '@/config/graph'

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


export function getNodeStyle(type: NodeType, weight: number, label?: string): NodeStyle {
  const weightBoost = Math.min(weight * 1.1, 24)
  const isParentTag = type === 'tag' && !!getTagConfig(label ?? '')

  switch (type) {
    case 'tag':
      return {
        size:        8 + weightBoost,
        shape:       'rect',
        fill:        isParentTag ? COLORS.BLACK : COLORS.MID,
        stroke:      isParentTag ? COLORS.BLACK : COLORS.MID,
        strokeWidth: 0,
        fontSize:    9,
        textColor:   isParentTag ? COLORS.BLACK : COLORS.MID,
        textX:       0,
        textY:       (8 + weightBoost) / 2 + 12,
        labelClass:  'tagLabel',
        iconMode:    'shape',
      }
    case 'entry':
    default:
      return {
        size:        8,
        shape:       'rect',
        fill:        COLORS.MIDLIGHT,
        stroke:      COLORS.MID,
        strokeWidth: 0,
        fontSize:    8,
        textColor:   COLORS.MID,
        textX:       0,
        textY:       16,
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
        .attr('r', s / 2)
        .attr('fill',         style.fill)
        .attr('stroke',       style.stroke)
        .attr('stroke-width', style.strokeWidth)
        .attr('vector-effect', 'non-scaling-stroke')
      break
    case 'rect':
      el.append('rect')
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