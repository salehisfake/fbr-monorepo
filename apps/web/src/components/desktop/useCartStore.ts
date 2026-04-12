'use client'

import { create } from 'zustand'
import type { Cart, CartLine } from '@/lib/shopify'
import {
  createCart,
  addCartLines as shopifyAddLines,
  removeCartLine,
  getCart,
} from '@/lib/shopify'

const CART_STORAGE_KEY = 'fbr_cart_id'

interface CartStore {
  cartId:        string | null
  lines:         CartLine[]
  checkoutUrl:   string | null
  totalQuantity: number
  isOpen:        boolean
  isLoading:     boolean

  openFlyout:      () => void
  closeFlyout:     () => void
  clearCart:       () => void
  addToCart:       (merchandiseId: string, quantity?: number) => Promise<void>
  removeFromCart:  (lineId: string) => Promise<void>
  hydrate:         () => Promise<void>
}

function applyCart(cart: Cart) {
  return {
    cartId:        cart.cartId,
    lines:         cart.lines,
    checkoutUrl:   cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
  }
}

export const useCartStore = create<CartStore>((set, get) => ({
  cartId:        null,
  lines:         [],
  checkoutUrl:   null,
  totalQuantity: 0,
  isOpen:        false,
  isLoading:     false,

  openFlyout:  () => set({ isOpen: true }),
  closeFlyout: () => set({ isOpen: false }),

  clearCart: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(CART_STORAGE_KEY)
    set({ cartId: null, lines: [], checkoutUrl: null, totalQuantity: 0 })
  },

  /**
   * On client mount, restore cartId from localStorage and sync with Shopify.
   * If the cart has expired, clears the stored id.
   */
  hydrate: async () => {
    if (typeof window === 'undefined') return
    const savedId = localStorage.getItem(CART_STORAGE_KEY)
    if (!savedId) return
    const cart = await getCart(savedId)
    if (!cart) {
      localStorage.removeItem(CART_STORAGE_KEY)
      return
    }
    set(applyCart(cart))
  },

  addToCart: async (merchandiseId: string, quantity = 1) => {
    if (!merchandiseId) return
    set({ isLoading: true })
    try {
      const { cartId } = get()
      let cart: Cart

      if (cartId) {
        const updated = await shopifyAddLines(cartId, merchandiseId, quantity)
        if (updated) {
          cart = updated
        } else {
          // Cart expired — create a new one
          if (typeof window !== 'undefined') localStorage.removeItem(CART_STORAGE_KEY)
          cart = await createCart(merchandiseId, quantity)
        }
      } else {
        cart = await createCart(merchandiseId, quantity)
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(CART_STORAGE_KEY, cart.cartId)
      }
      set({ ...applyCart(cart), isOpen: true })
    } catch (err) {
      console.error('[CartStore] addToCart failed:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  removeFromCart: async (lineId: string) => {
    const { cartId } = get()
    if (!cartId) return
    set({ isLoading: true })
    try {
      const cart = await removeCartLine(cartId, lineId)
      set(applyCart(cart))
    } catch (err) {
      console.error('[CartStore] removeFromCart failed:', err)
    } finally {
      set({ isLoading: false })
    }
  },
}))
