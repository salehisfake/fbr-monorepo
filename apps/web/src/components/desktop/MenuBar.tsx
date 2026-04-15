'use client'

import { useEffect, useRef } from 'react'
import { useCartStore } from './useCartStore'
import StoreFlyout from './StoreFlyout'
import styles from './MenuBar.module.css'

function SearchIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <circle cx='11' cy='11' r='8' />
      <line x1='21' y1='21' x2='16.65' y2='16.65' />
    </svg>
  )
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
  const storeRef  = useRef<HTMLDivElement | null>(null)
  const flyoutRef = useRef<HTMLDivElement | null>(null)

  const isOpen        = useCartStore((s) => s.isOpen)
  const totalQuantity = useCartStore((s) => s.totalQuantity)
  const openFlyout    = useCartStore((s) => s.openFlyout)
  const closeFlyout   = useCartStore((s) => s.closeFlyout)
  const hydrate       = useCartStore((s) => s.hydrate)

  useEffect(() => { hydrate() }, [hydrate])

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
    <div className={styles.bar}>
      <div className={styles.topBlock}>
        <button type='button' className={styles.logoButton} aria-label='Home'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src='/FBR_Logo_Sharp.svg'
            alt='FBR'
            width={28}
            height={28}
            className={styles.logoImage}
          />
        </button>
        <span className={styles.wordmark}>dex v2.0 © FBR ROM</span>
      </div>

      <div className={styles.searchBlock}>
        <button type='button' className={styles.searchButton} aria-label='Search'>
          <SearchIcon />
        </button>
      </div>

      {totalQuantity > 0 && (
        <div className={styles.storeRegion}>
          <div ref={storeRef}>
            <button
              type='button'
              onClick={toggleFlyout}
              aria-label='Cart'
              className={`${styles.storeButton} ${isOpen ? styles.storeButtonOpen : ''}`}
            >
              <BagIcon className={styles.bagIcon} />
              <span className={styles.cartQty}>{totalQuantity}</span>
            </button>
          </div>

          {isOpen && <StoreFlyout ref={flyoutRef} onClose={closeFlyout} />}
        </div>
      )}
    </div>
  )
}
