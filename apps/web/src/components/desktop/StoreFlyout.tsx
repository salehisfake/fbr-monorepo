'use client'

import { useEffect, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { useCartStore } from './useCartStore'
import { COLORS, Z, LAYOUT } from '@/lib/tokens'
import styles from './StoreFlyout.module.css'

// ── Product configuration from env ────────────────────────────────────────────
const VARIANT_GID = process.env.NEXT_PUBLIC_SHOPIFY_MDOT_VARIANT_GID ?? 'gid://shopify/ProductVariant/46961502224515'
const PRICE       = process.env.NEXT_PUBLIC_MDOT_PRICE               ?? ''
const IMAGE_URL   = process.env.NEXT_PUBLIC_MDOT_IMAGE_URL            ?? ''
const TITLE       = process.env.NEXT_PUBLIC_MDOT_TITLE                ?? 'mDOT'
const DESCRIPTION = process.env.NEXT_PUBLIC_MDOT_DESCRIPTION          ?? 'A preorder for the mDOT device. Your Shopify order ID (in the confirmation email) is your product key.'

interface StoreFlyoutProps {
  onClose: () => void
}

/**
 * Store + cart in one panel. Primary action is Purchase → Shopify checkout.
 * "Add to cart" only appears outside this flyout (e.g. PreorderCTA in posts).
 */
const StoreFlyout = forwardRef<HTMLDivElement, StoreFlyoutProps>(function StoreFlyout(
  { onClose },
  ref,
) {
  const lines          = useCartStore((s) => s.lines)
  const totalQuantity  = useCartStore((s) => s.totalQuantity)
  const isLoading      = useCartStore((s) => s.isLoading)
  const addToCart      = useCartStore((s) => s.addToCart)
  const removeFromCart = useCartStore((s) => s.removeFromCart)

  const hasItems = lines.length > 0
  const hasMdot  = VARIANT_GID !== '' && lines.some((l) => l.merchandiseId === VARIANT_GID)
  const canPurchase = VARIANT_GID !== '' && !isLoading

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handlePurchase() {
    if (!canPurchase) return
    try {
      if (!hasMdot) {
        await addToCart(VARIANT_GID, 1)
      }
      const url = useCartStore.getState().checkoutUrl
      if (url) window.location.assign(url)
    } catch (err) {
      console.error('[StoreFlyout] purchase failed:', err)
    }
  }

  const panel = (
    <div
      ref={ref}
      style={{
        position:  'fixed',
        top:       52,
        right:     LAYOUT.WINDOW_GAP,
        zIndex:    Z.DROPDOWN,
        isolation: 'isolate',
        background: COLORS.WHITE,
        border: `1px solid ${COLORS.ZINC_200}`,
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
                  type='button'
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.purchaseWrap}>
        <button
          type='button'
          className={styles.purchaseButton}
          onClick={handlePurchase}
          disabled={!canPurchase}
        >
          {isLoading
            ? 'Purchasing…'
            : VARIANT_GID
              ? 'Purchase'
              : 'Coming soon'}
        </button>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
})

export default StoreFlyout
