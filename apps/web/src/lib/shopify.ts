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

/** Variant + product fields for store UI (from Storefront `node` query). */
export interface ProductVariantDisplay {
  imageUrl:       string | null
  imageAlt:       string
  productTitle:   string
  formattedPrice: string
  /** Plain-ish description; may be empty. */
  description:    string | null
}

const STORE_DOMAIN     = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN     ?? 'fbr-shop-3.myshopify.com'
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? 'a1cc1357e5cb963a863f3432c67d8f7d'
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
 * Load variant image, price, and product copy for the embedded store panel.
 * Uses the same Storefront token as checkout — safe to call from the browser.
 */
export async function getProductVariantForDisplay(
  merchandiseId: string,
): Promise<ProductVariantDisplay | null> {
  if (!merchandiseId) return null
  type NodeResp = {
    node: {
      title: string
      price: { amount: string; currencyCode: string }
      image: { url: string; altText: string | null } | null
      product: {
        title: string
        description: string
        descriptionHtml: string
        featuredImage: { url: string; altText: string | null } | null
      }
    } | null
  }
  try {
    const data = await shopifyFetch<NodeResp>(
      `
      query productVariantForStore($id: ID!) {
        node(id: $id) {
          ... on ProductVariant {
            title
            price {
              amount
              currencyCode
            }
            image {
              url(transform: { maxWidth: 960 })
              altText
            }
            product {
              title
              description
              descriptionHtml
              featuredImage {
                url(transform: { maxWidth: 960 })
                altText
              }
            }
          }
        }
      }
    `,
      { id: merchandiseId },
    )
    const n = data.node
    if (!n?.price) return null

    const imageUrl = n.image?.url ?? n.product.featuredImage?.url ?? null
    const imageAlt =
      n.image?.altText ?? n.product.featuredImage?.altText ?? n.product.title

    const plain = n.product.description?.trim() ?? ''
    const html = n.product.descriptionHtml?.trim() ?? ''
    const desc =
      plain ||
      (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '') ||
      null

    return {
      imageUrl,
      imageAlt,
      productTitle: n.product.title,
      formattedPrice: formatMoney(n.price.amount, n.price.currencyCode),
      description: desc,
    }
  } catch (err) {
    console.warn('[shopify] getProductVariantForDisplay failed:', err)
    return null
  }
}
