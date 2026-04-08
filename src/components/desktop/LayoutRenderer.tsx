// apps/web/src/components/desktop/LayoutRenderer.tsx
'use client'

import { useRef, useCallback } from 'react'
import type { LayoutNode, LeafNode, SplitNode } from './useLayoutStore'
import { useLayoutStore } from './useLayoutStore'
import Window from './Window'
import SplitHandle from './SplitHandle'

interface LayoutRendererProps {
  node:          LayoutNode
  alwaysVisible?: boolean
}

/**
 * Recursively renders the binary layout tree.
 * - LeafNode  → Window (app chrome + content)
 * - SplitNode → two LayoutRenderers separated by a drag handle
 */
export default function LayoutRenderer({ node, alwaysVisible }: LayoutRendererProps) {
  if (node.type === 'leaf') {
    return <LeafRenderer node={node} alwaysVisible={alwaysVisible} />
  }
  return <SplitRenderer node={node} alwaysVisible={alwaysVisible} />
}

// ── Leaf ──────────────────────────────────────────────────────────────────────

function LeafRenderer({
  node,
  alwaysVisible,
}: {
  node: LeafNode
  alwaysVisible?: boolean
}) {
  const focusedId  = useLayoutStore((s) => s.focusedId)
  const focusWindow = useLayoutStore((s) => s.focusWindow)
  const closeWindow = useLayoutStore((s) => s.closeWindow)

  return (
    <Window
      node={node}
      isActive={focusedId === node.id}
      onFocus={() => focusWindow(node.id)}
      onClose={() => closeWindow(node.id)}
      alwaysVisible={alwaysVisible}
    />
  )
}

// ── Split ─────────────────────────────────────────────────────────────────────

function SplitRenderer({
  node,
  alwaysVisible,
}: {
  node: SplitNode
  alwaysVisible?: boolean
}) {
  const setRatio    = useLayoutStore((s) => s.setRatio)
  const containerRef = useRef<HTMLDivElement>(null)
  const isH = node.direction === 'h'

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()

    const container = containerRef.current
    if (!container) return

    const onMouseMove = (ev: MouseEvent) => {
      const rect      = container.getBoundingClientRect()
      const rawRatio  = isH
        ? (ev.clientX - rect.left)  / rect.width
        : (ev.clientY - rect.top)   / rect.height
      // Clamp so neither pane collapses below 10%
      setRatio(node.id, Math.max(0.1, Math.min(0.9, rawRatio)))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      // Reset cursor on document body
      document.body.style.cursor       = ''
      document.body.style.userSelect   = ''
    }

    document.body.style.cursor     = isH ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }, [isH, node.id, setRatio])

  return (
    <div
      ref={containerRef}
      style={{
        display:        'flex',
        flexDirection:  isH ? 'row' : 'column',
        width:          '100%',
        height:         '100%',
      }}
    >
      <div style={{ flex: node.ratio, overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
        <LayoutRenderer node={node.first} alwaysVisible={alwaysVisible} />
      </div>

      <SplitHandle direction={node.direction} onMouseDown={handleMouseDown} />

      <div style={{ flex: 1 - node.ratio, overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
        <LayoutRenderer node={node.second} alwaysVisible={alwaysVisible} />
      </div>
    </div>
  )
}
