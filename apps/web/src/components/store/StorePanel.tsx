'use client'

import { useEffect, useState } from 'react'
import { createCart, getProductVariantForDisplay, type ProductVariantDisplay } from '@/lib/shopify'
import styles from './StorePanel.module.css'

const VARIANT_GID =
  process.env.NEXT_PUBLIC_SHOPIFY_MDOT_VARIANT_GID ??
  'gid://shopify/ProductVariant/46961502224515'
const PRICE = process.env.NEXT_PUBLIC_MDOT_PRICE ?? ''
const IMAGE_URL = process.env.NEXT_PUBLIC_MDOT_IMAGE_URL ?? ''
const TITLE = process.env.NEXT_PUBLIC_MDOT_TITLE ?? 'mDOT'
const DESCRIPTION =
  process.env.NEXT_PUBLIC_MDOT_DESCRIPTION ??
  'A preorder for the mDOT device. Your Shopify order ID (in the confirmation email) is your product key.'

function descriptionForDisplay(raw: string | null): string {
  if (!raw) return ''
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Product card + Purchase — creates a one-line Storefront cart and redirects to Shopify checkout.
 */
export default function StorePanel() {
  const [fromShopify, setFromShopify] = useState<ProductVariantDisplay | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!VARIANT_GID) return
    let cancelled = false
    void getProductVariantForDisplay(VARIANT_GID).then((v) => {
      if (!cancelled && v) setFromShopify(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const imageUrl = fromShopify?.imageUrl || IMAGE_URL || null
  const imageAlt = fromShopify?.imageAlt || fromShopify?.productTitle || TITLE
  const productTitle = fromShopify?.productTitle ?? TITLE
  const priceLabel = fromShopify?.formattedPrice || PRICE
  const description =
    (fromShopify?.description ? descriptionForDisplay(fromShopify.description) : '') ||
    DESCRIPTION

  const canPurchase = Boolean(VARIANT_GID) && !busy

  async function handlePurchase() {
    if (!VARIANT_GID || busy) return
    setBusy(true)
    try {
      const cart = await createCart(VARIANT_GID, 1)
      if (cart.checkoutUrl) window.location.assign(cart.checkoutUrl)
    } catch (err) {
      console.error('[StorePanel] checkout failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={styles.productSection}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt} className={styles.productImage} />
        ) : (
          <div className={styles.productImagePlaceholder} aria-hidden />
        )}

        <div className={styles.productMeta}>
          <span className={styles.productTitle}>{productTitle}</span>
          {priceLabel ? <span className={styles.productPrice}>{priceLabel}</span> : null}
        </div>

        <p className={styles.productDesc}>{description}</p>
      </div>

      <div className={styles.purchaseWrap}>
        <button
          type="button"
          className={styles.purchaseButton}
          onClick={handlePurchase}
          disabled={!canPurchase}
        >
          {busy ? 'Opening checkout…' : VARIANT_GID ? 'Purchase' : 'Coming soon'}
        </button>
      </div>
    </>
  )
}
