'use client'

import { useEffect, useRef, useState } from 'react'
import GlassSurface from '@/components/GlassSurface'
import FBRLogo from '@/components/FBRLogo'
import { useCartStore } from './useCartStore'
import StoreFlyout from './StoreFlyout'
import styles from './MenuBar.module.css'

/** e.g. "Tue Apr 7     5:53 PM" — spaces preserved via .clock { white-space: pre } */
function formatMenubarClock(value: Date): string {
  const datePart = value
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    .replaceAll(',', '')
  const timePart = value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${datePart}     ${timePart}`
}

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

export default function MenuBar() {
  const rootRef      = useRef<HTMLDivElement | null>(null)
  const storeRef     = useRef<HTMLDivElement | null>(null)
  const flyoutRef    = useRef<HTMLDivElement | null>(null)
  const [nowLabel, setNowLabel] = useState(() => formatMenubarClock(new Date()))

  const isOpen        = useCartStore((s) => s.isOpen)
  const totalQuantity = useCartStore((s) => s.totalQuantity)
  const openFlyout    = useCartStore((s) => s.openFlyout)
  const closeFlyout   = useCartStore((s) => s.closeFlyout)
  const hydrate       = useCartStore((s) => s.hydrate)

  // Clock tick
  useEffect(() => {
    const tick = () => setNowLabel(formatMenubarClock(new Date()))
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Restore cart from localStorage on mount
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Close flyout on outside click (flyout portaled to body — track both roots)
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

  return (
    <GlassSurface
      ref={rootRef}
      glass='MENUBAR'
      className={styles.bar}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
      }}
    >
      <div className={styles.brandRow}>
        <FBRLogo />
        <span className={styles.brandTitle}>FBR dex</span>
      </div>

      <div className={styles.clock}>{nowLabel}</div>

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
