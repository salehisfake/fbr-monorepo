'use client'

import GlassSurface from '@/components/GlassSurface'
import StorePanel from './StorePanel'
import styles from './StorePanel.module.css'

/**
 * MDX store block — product from Shopify + Purchase → checkout (no on-site cart).
 */
export default function EmbeddedStore() {
  return (
    <div className={styles.embeddedWrap}>
      <GlassSurface
        glass="WINDOW"
        className={styles.embeddedSurface}
        style={{ width: '100%', maxWidth: 280 }}
      >
        <StorePanel />
      </GlassSurface>
    </div>
  )
}
