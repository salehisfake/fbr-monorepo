// apps/web/src/lib/shopify.ts
//
// Thin client for Shopify Storefront GraphQL API.
// The Storefront Access Token is designed to be public and safe to call
// directly from the browser — no server-side proxy required.

export interface CartLine {
  id:            string
  merchandiseId: string
  title:         string
  quantity:      number
  cost:          string   // formatted, e.g. "AU$99.00"
}

export interface Cart {
  cartId:        string
  lines:         CartLine[]
  checkoutUrl:   string
  totalQuantity: number
}

const STORE_DOMAIN     = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN     ?? ''
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? ''
const API_VERSION      = '2024-10'

// ── Internal helpers ──────────────────────────────────────────────────────────

function formatMoney(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-AU', {
    style:    'currency',
    currency: currencyCode,
  }).format(parseFloat(amount))
}

async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(
    `https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method:  'POST',
      headers: {
        'Content-Type':                        'application/json',
        'X-Shopify-Storefront-Access-Token':   STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  )
  if (!res.ok) throw new Error(`Shopify Storefront error: ${res.status}`)
  const json = await res.json() as { data?: T; errors?: Array<{ message: string }> }
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data as T
}

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        cost {
          totalAmount { amount currencyCode }
        }
        merchandise {
          ... on ProductVariant {
            id
            product { title }
          }
        }
      }
    }
  }
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCart(raw: any): Cart {
  return {
    cartId:        raw.id,
    checkoutUrl:   raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    lines: raw.lines.edges.map(({ node }: any) => ({      // eslint-disable-line @typescript-eslint/no-explicit-any
      id:            node.id,
      merchandiseId: node.merchandise.id,
      title:         node.merchandise.product.title,
      quantity:      node.quantity,
      cost:          formatMoney(
        node.cost.totalAmount.amount,
        node.cost.totalAmount.currencyCode,
      ),
    })),
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Create a new cart with a single line item. */
export async function createCart(merchandiseId: string, quantity: number): Promise<Cart> {
  const data = await shopifyFetch<{ cartCreate: { cart: unknown } }>(`
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ${CART_FIELDS} }
      }
    }
  `, { input: { lines: [{ merchandiseId, quantity }] } })
  return parseCart(data.cartCreate.cart)
}

/**
 * Add lines to an existing cart.
 * Returns null if the cart has expired or is invalid — caller should create a new one.
 */
export async function addCartLines(
  cartId: string,
  merchandiseId: string,
  quantity: number,
): Promise<Cart | null> {
  const data = await shopifyFetch<{ cartLinesAdd: { cart: unknown | null } }>(`
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
      }
    }
  `, { cartId, lines: [{ merchandiseId, quantity }] })
  if (!data.cartLinesAdd.cart) return null
  return parseCart(data.cartLinesAdd.cart)
}

/** Remove a single line from a cart by its line ID. */
export async function removeCartLine(cartId: string, lineId: string): Promise<Cart> {
  const data = await shopifyFetch<{ cartLinesRemove: { cart: unknown } }>(`
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FIELDS} }
      }
    }
  `, { cartId, lineIds: [lineId] })
  return parseCart(data.cartLinesRemove.cart)
}

/** Fetch a cart by ID. Returns null if the cart has expired or does not exist. */
export async function getCart(cartId: string): Promise<Cart | null> {
  try {
    const data = await shopifyFetch<{ cart: unknown | null }>(`
      query getCart($cartId: ID!) {
        cart(id: $cartId) { ${CART_FIELDS} }
      }
    `, { cartId })
    if (!data.cart) return null
    return parseCart(data.cart)
  } catch {
    return null
  }
}
