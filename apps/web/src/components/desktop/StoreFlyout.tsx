'use client'

import { useEffect, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import GlassSurface from '@/components/GlassSurface'
import { useCartStore } from './useCartStore'
import { Z, LAYOUT } from '@/lib/tokens'
import styles from './StoreFlyout.module.css'

// ── Product configuration from env ────────────────────────────────────────────
const VARIANT_GID = process.env.NEXT_PUBLIC_SHOPIFY_MDOT_VARIANT_GID ?? ''
const PRICE       = process.env.NEXT_PUBLIC_MDOT_PRICE               ?? ''
const IMAGE_URL   = process.env.NEXT_PUBLIC_MDOT_IMAGE_URL            ?? ''
const TITLE       = process.env.NEXT_PUBLIC_MDOT_TITLE                ?? 'mDOT'
const DESCRIPTION = process.env.NEXT_PUBLIC_MDOT_DESCRIPTION          ?? 'A preorder for the mDOT device. Your license key will be emailed after purchase.'

interface StoreFlyoutProps {
  onClose: () => void
}

/**
 * Renders via createPortal(document.body) so backdrop-filter samples the real
 * page (graph / windows). Nesting under MenuBar's GlassSurface breaks blur —
 * the backdrop becomes an empty or flattened layer.
 */
const StoreFlyout = forwardRef<HTMLDivElement, StoreFlyoutProps>(function StoreFlyout(
  { onClose },
  ref,
) {
  const lines          = useCartStore((s) => s.lines)
  const checkoutUrl    = useCartStore((s) => s.checkoutUrl)
  const totalQuantity  = useCartStore((s) => s.totalQuantity)
  const isLoading      = useCartStore((s) => s.isLoading)
  const addToCart      = useCartStore((s) => s.addToCart)
  const removeFromCart = useCartStore((s) => s.removeFromCart)

  const hasItems = lines.length > 0
  const isInCart = VARIANT_GID !== '' && lines.some((l) => l.merchandiseId === VARIANT_GID)
  const canAdd   = VARIANT_GID !== '' && !isLoading

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleAddToCart() {
    if (!canAdd) return
    addToCart(VARIANT_GID, 1)
  }

  const panel = (
    <GlassSurface
      ref={ref}
      glass='STORE_FLYOUT'
      style={{
        position:  'fixed',
        top:       LAYOUT.MENUBAR_HEIGHT + 4,
        right:     8,
        zIndex:    Z.DROPDOWN,
        isolation: 'isolate',
      }}
      className={styles.flyout}
    >
      <div className={styles.productSection}>
        {IMAGE_URL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={IMAGE_URL}
            alt={TITLE}
            className={styles.productImage}
          />
        ) : (
          <div className={styles.productImagePlaceholder} aria-hidden />
        )}

        <div className={styles.productMeta}>
          <span className={styles.productTitle}>{TITLE}</span>
          {PRICE && <span className={styles.productPrice}>{PRICE}</span>}
        </div>

        <p className={styles.productDesc}>{DESCRIPTION}</p>

        <button
          className={styles.addButton}
          onClick={handleAddToCart}
          disabled={!canAdd}
        >
          {isLoading ? 'Adding…' : isInCart ? 'Add another' : VARIANT_GID ? 'Add to cart' : 'Coming soon'}
        </button>
      </div>

      {hasItems && (
        <>
          <hr className={styles.divider} />

          <div className={styles.cartSection}>
            <div className={styles.cartHeader}>
              Cart · {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
            </div>

            {lines.map((line) => (
              <div key={line.id} className={styles.cartLine}>
                <span className={styles.lineTitle}>{line.title}</span>
                <span className={styles.lineQty}>×{line.quantity}</span>
                <span className={styles.lineCost}>{line.cost}</span>
                <button
                  className={styles.removeButton}
                  onClick={() => removeFromCart(line.id)}
                  disabled={isLoading}
                >
                  remove
                </button>
              </div>
            ))}

            {checkoutUrl && (
              <a href={checkoutUrl} className={styles.checkoutButton}>
                Checkout
              </a>
            )}
          </div>
        </>
      )}
    </GlassSurface>
  )

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
})

export default StoreFlyout
