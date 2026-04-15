'use client'

import { useEffect, useRef } from 'react'
import GlassSurface from '@/components/GlassSurface'
import FBRLogo from '@/components/FBRLogo'
import { useCartStore } from './useCartStore'
import { useLayoutStore } from './useLayoutStore'
import StoreFlyout from './StoreFlyout'
import { COLORS, CV, Z, DURATION, LAYOUT } from '@/lib/tokens'
import styles from './MenuBar.module.css'

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width='11'
      height='11'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
      <line x1='3' y1='6' x2='21' y2='6' />
      <path d='M16 10a4 4 0 01-8 0' />
    </svg>
  )
}

interface MenuBarProps {
  isMobile?: boolean
}

export default function MenuBar({ isMobile = false }: MenuBarProps) {
  const rootRef      = useRef<HTMLDivElement | null>(null)
  const storeRef     = useRef<HTMLDivElement | null>(null)
  const flyoutRef    = useRef<HTMLDivElement | null>(null)

  const isOpen        = useCartStore((s) => s.isOpen)
  const totalQuantity = useCartStore((s) => s.totalQuantity)
  const openFlyout    = useCartStore((s) => s.openFlyout)
  const closeFlyout   = useCartStore((s) => s.closeFlyout)
  const hydrate       = useCartStore((s) => s.hydrate)

  const windows             = useLayoutStore((s) => s.windows)
  const mobileActivePage    = useLayoutStore((s) => s.mobileActivePage)
  const setMobileActivePage = useLayoutStore((s) => s.setMobileActivePage)
  const focusWindow         = useLayoutStore((s) => s.focusWindow)
  const focusGraphTail      = useLayoutStore((s) => s.focusGraphTail)

  const totalDots = 1 + windows.length

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!isOpen) return
    function handleMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (storeRef.current?.contains(t)) return
      if (flyoutRef.current?.contains(t)) return
      closeFlyout()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, closeFlyout])

  function toggleFlyout() {
    if (isOpen) closeFlyout()
    else openFlyout()
  }

  const handleDotClick = (pageIndex: number) => {
    if (pageIndex === 0) {
      if (windows.length > 0) focusGraphTail()
      else setMobileActivePage(0)
      return
    }
    setMobileActivePage(pageIndex)
    const w = windows[pageIndex - 1]
    if (w) focusWindow(w.id)
  }

  return (
    <GlassSurface
      ref={rootRef}
      glass='MENUBAR'
      className={styles.bar}
      style={{
        position: 'fixed',
        bottom: LAYOUT.WINDOW_GAP,
        left:   LAYOUT.WINDOW_GAP,
        right:  LAYOUT.WINDOW_GAP,
      }}
    >
      <div className={styles.brandRow}>
        <FBRLogo />
        <span className={styles.brandTitle}>FBR dex</span>
      </div>

      {isMobile && windows.length > 0 && (
        <div className={styles.dotsZone} role='tablist' aria-label='Switch view'>
          {Array.from({ length: totalDots }, (_, i) => {
            const isActive = mobileActivePage === i
            return (
              <button
                key={i}
                role='tab'
                aria-selected={isActive}
                aria-label={i === 0 ? 'Graph view' : `Window ${i}`}
                onClick={() => handleDotClick(i)}
                style={{
                  width:        isActive ? '28px' : '10px',
                  height:       '10px',
                  borderRadius: '1px',
                  background:   isActive ? COLORS.BLACK : CV.zinc700FillMuted,
                  border:       `1px solid ${COLORS.ZINC_200}`,
                  transition:   `width ${DURATION.FAST} ease`,
                  cursor:       'pointer',
                  padding:      0,
                  flexShrink:   0,
                }}
              />
            )
          })}
        </div>
      )}

      <div className={styles.storeRegion}>
        <div ref={storeRef}>
          <button
            type='button'
            onClick={toggleFlyout}
            aria-label='Store'
            className={`${styles.storeButton} ${isOpen ? styles.storeButtonOpen : ''}`}
          >
            <BagIcon className={styles.bagIcon} />
            {totalQuantity > 0 && (
              <span className={styles.cartQty}>{totalQuantity}</span>
            )}
          </button>
        </div>

        {isOpen && <StoreFlyout ref={flyoutRef} onClose={closeFlyout} />}
      </div>
    </GlassSurface>
  )
}
