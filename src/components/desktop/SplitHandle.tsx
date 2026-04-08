// apps/web/src/components/desktop/SplitHandle.tsx
'use client'

import { useCallback } from 'react'
import { COLORS } from '@/components/graph/graphConstants'

export interface SplitHandleProps {
  direction:    'h' | 'v'
  onMouseDown:  (e: React.MouseEvent) => void
}

/**
 * Thin drag handle rendered between the two children of a SplitNode.
 * The 5px hit area contains a 1px visible line.
 * The parent SplitRenderer owns the resize logic and passes onMouseDown.
 */
export default function SplitHandle({ direction, onMouseDown }: SplitHandleProps) {
  const isH = direction === 'h'

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        flexShrink: 0,
        width:      isH ? '5px'  : '100%',
        height:     isH ? '100%' : '5px',
        cursor:     isH ? 'col-resize' : 'row-resize',
        position:   'relative',
        zIndex:     1,
        background: 'transparent',
        userSelect: 'none',
      }}
    >
      {/* 1px visible line centred in the 5px hit area */}
      <div
        style={{
          position:   'absolute',
          background: COLORS.LIGHT,
          ...(isH
            ? { top: 0, bottom: 0, left: '50%', width: '1px', transform: 'translateX(-50%)' }
            : { left: 0, right: 0, top: '50%', height: '1px', transform: 'translateY(-50%)' }
          ),
        }}
      />
    </div>
  )
}
