// apps/web/src/components/desktop/Taskbar.tsx
'use client'

import { useWindowStore } from './useWindowStore'
import { COLORS } from '@/components/graph/graphConstants'

export default function Taskbar() {
  const { windows, closeWindow, focusWindow } = useWindowStore()

  return (
    <div style={{
      position:   'fixed',
      bottom:     0,
      left:       0,
      right:      0,
      height:     '40px',
      background: 'none',
      border:  `0px solid ${COLORS.LIGHT}`,
      display:    'flex',
      alignItems: 'center',
      padding:    '0 12px',
      margin: '10px',
      gap:        '8px',
      zIndex:     9999,
      fontFamily: 'var(--font-mplus)',
    }}>
      {windows.map((win) => (
        <div
          key={win.id}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '6px',
            padding:       '0 10px 0 12px',
            height:        '26px',
            border:        `1px solid ${COLORS.LIGHT}`,
            background: COLORS.WHITE,
            cursor:        'pointer',
            fontSize:      '11px',
            fontWeight:    '700',
            letterSpacing: '0.05em',
            color:         COLORS.BLACK,
            whiteSpace:    'nowrap',
          }}
          onClick={() => focusWindow(win.id)}
        >
          {win.title}
          <button
            onClick={(e) => { e.stopPropagation(); closeWindow(win.id) }}
            style={{
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              fontSize:   '13px',
              color:      COLORS.MID,
              padding:    '0 0 0 4px',
              lineHeight: 1,
              fontFamily: 'var(--font-mplus)',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}