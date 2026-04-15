// apps/web/src/components/desktop/Window.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { WindowItem } from './useLayoutStore'
import AppHost from './AppHost'
import { COLORS, Z } from '@/lib/tokens'
import styles from './Window.module.css'

export interface WindowProps {
  node:           WindowItem
  onClose:        () => void
  onFocus:        () => void
}

export default function Window({
  node,
  onClose,
  onFocus,
}: WindowProps) {
  // ── Exit animation ────────────────────────────────────────────────────────
  // Delay actual unmount so windowOut keyframe can play.
  // WINDOW_OUT duration (140ms) must stay in sync with tokens.ts WINDOW_OUT.

  const [isClosing, setIsClosing]     = useState(false)
  const closeTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation()
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => onClose(), 140)
  }

  return (
    <div
      className={isClosing ? styles.closing : styles.entering}
      style={{
        width:         '100%',
        height:        '100%',
        overflow:      'hidden',
        boxSizing:     'border-box',
        background:    COLORS.WHITE,
        border:        `1px solid ${COLORS.ZINC_200}`,
        outline:       `0px solid ${COLORS.ZINC_200}`,
        outlineOffset: -1,
      }}
      onClick={onFocus}
    >
      <div className={styles.tabBar} style={{ zIndex: Z.CHROME }}>
        <button
          onClick={handleClose}
          className={styles.closeButton}
          aria-label="Close window"
        />
      </div>

      <div
        className={styles.content}
        style={{ zIndex: Z.CONTENT }}
      >
        <AppHost node={node} />
      </div>
    </div>
  )
}
