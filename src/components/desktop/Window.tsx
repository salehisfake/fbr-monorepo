// apps/web/src/components/desktop/Window.tsx
'use client'

import { useState } from 'react'
import { Rnd } from 'react-rnd'
import { motion, AnimatePresence } from 'framer-motion'
import { useWindowStore, type WindowItem } from './useWindowStore'
import PostContent from './PostContent'
import { COLORS } from '@/components/graph/graphConstants'

interface WindowProps {
  win: WindowItem
}

export default function Window({ win }: WindowProps) {
  const { closeWindow, focusWindow, updateWindow } = useWindowStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isClosing,  setIsClosing]  = useState(false)

  const handleClose = () => {
    setIsClosing(true)
  }

  const handleDragStart = () => {
    setIsDragging(true)
    focusWindow(win.id)
  }

  const handleDragStop = (_e: any, d: { x: number; y: number }) => {
    setIsDragging(false)
    updateWindow(win.id, {
      x: d.x,
      y: d.y,
    })
  }


  // Transform origin is the node that was clicked, relative to window position
  const originX = win.originX - win.x
  const originY = win.originY - win.y

  return (
    <Rnd
      position={{ x: win.x,     y: win.y      }}
      size={{     width: win.width, height: win.height }}
      enableResizing={false}
      bounds="window"
      style={{
        zIndex:        win.zIndex,
        position:      'absolute',
        pointerEvents: 'auto',
        transition:    isDragging ? 'none' : 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
        }}
      onMouseDown={() => focusWindow(win.id)}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      dragHandleClassName="window-titlebar"
    >
      <AnimatePresence onExitComplete={() => closeWindow(win.id)}>
        {!isClosing && (
        <motion.div
        style={{ width: '100%', height: '100%' }}
        initial={{ opacity: 0, x: 60 }}
        animate={{
            opacity: 1,
            x:       0,
            scale:   isDragging ? 0.97 : 1,
        }}
        exit={{ opacity: 0, x: 60 }}
        transition={{
            opacity: { duration: 0.2 },
            x:       { type: 'tween', duration: 0.1, ease: 'circOut' },
            scale:   { duration: 0.15 },
        }}
        >
            <div style={{
              width:         '100%',
              height:        '100%',
              background:    'rgba(255,255,255,0.99)',
              border:        `1px solid ${COLORS.OFFWHITE}`,
              display:       'flex',
              flexDirection: 'column',
              overflow:      'hidden',
              boxShadow:     isDragging
                ? '0 16px 48px rgba(0,0,0,0.09)'
                : '0 4px 24px rgba(0,0,0,0.05)',
              boxSizing:     'border-box',
              transition:    'box-shadow 0.15s ease',
            }}>

              {/* Title bar */}
              <div
                className="window-titlebar"
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  padding:        '0 12px',
                  height:         '36px',
                  borderBottom:   `1px solid ${COLORS.OFFWHITE}`,
                  boxShadow:       '0 1px 0 rgba(0,0,0,0.05)',
                  background:      `${COLORS.WHITE}`,
                  cursor:         'move',
                  flexShrink:     0,
                  userSelect:     'none',
                }}
              >
                <span style={{
                  fontSize:      '11px',
                  fontFamily:    'var(--font-mplus)',
                  fontWeight:    '700',
                  color:         COLORS.BLACK,
                }}>
                  {win.title}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={handleClose}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background:  'none',
                      border:      'none',
                      cursor:      'pointer',
                      fontSize:    '16px',
                      color:       COLORS.MID,
                      padding:     '4px',
                      lineHeight:  1,
                      fontFamily:  'var(--font-mplus)',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {win.type === 'post' && <PostContent slug={win.slug} />}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Rnd>
  )
}