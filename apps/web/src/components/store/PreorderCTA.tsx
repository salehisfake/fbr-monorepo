'use client'

import { useCartStore } from '@/components/desktop/useCartStore'

/**
 * Opens the menubar store flyout. "Add to cart" lives here in post content;
 * inside the flyout the cart + Purchase (checkout) live together.
 */
export default function PreorderCTA() {
  const openFlyout = useCartStore((s) => s.openFlyout)

  return (
    <button
      onClick={openFlyout}
      className='formSubmit'
      style={{ marginTop: '0.5rem' }}
      type='button'
    >
      Add to cart
    </button>
  )
}
