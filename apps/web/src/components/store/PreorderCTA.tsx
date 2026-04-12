'use client'

import { useCartStore } from '@/components/desktop/useCartStore'

/**
 * PreorderCTA — embeds a "Pre-order" button in MDX post content.
 * Clicking it opens the store flyout in the menubar.
 * No props required; all product configuration lives in the flyout.
 */
export default function PreorderCTA() {
  const openFlyout = useCartStore((s) => s.openFlyout)

  return (
    <button
      onClick={openFlyout}
      className='formSubmit'
      style={{ marginTop: '0.5rem' }}
    >
      Pre-order mDOT
    </button>
  )
}
