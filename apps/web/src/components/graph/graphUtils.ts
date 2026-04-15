// apps/web/src/components/graph/graphUtils.ts

import type * as d3 from 'd3'
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

/** Horizontal gap between a node icon and its label text. */
export const LABEL_GAP = 6

/** One size for every node square and its label (font matches node height). */
export const UNIFORM_NODE_SIZE = 10
export const LABEL_FONT_SIZE = 12

/** Visual size of a node in SVG units (width/height of the square icon). */
export function getNodeSize(): number {
  return UNIFORM_NODE_SIZE
}

export function getNodeStyle(type: NodeType): NodeStyle {
  const size = getNodeSize()
  const fontSize = LABEL_FONT_SIZE

  switch (type) {
    case 'tag':
      return {
        size,
        shape:       'rect',
        fill:        COLORS.BLACK,
        stroke:      COLORS.BLACK,
        strokeWidth: 0,
        fontSize,
        textColor:   COLORS.BLACK,
        textX:       size / 2 + LABEL_GAP,
        textY:       0.75,
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
        fontSize,
        textColor:   COLORS.BLACK,
        textX:       size / 2 + LABEL_GAP,
        textY:       0.75,
        labelClass:  'entryLabel',
        iconMode:    'shape',
      }
  }
}

export function appendShape<Datum>(
  el: d3.Selection<SVGGElement, Datum, null, undefined>,
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
      .attr('shape-rendering', 'crispEdges')
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
        .attr('shape-rendering', 'crispEdges')
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
        .attr('shape-rendering', 'crispEdges')
        .attr('vector-effect', 'non-scaling-stroke')
      break
  }
}