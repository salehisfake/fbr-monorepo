// apps/web/src/app/api/shopify/webhooks/orders/route.ts
//
// Handles Shopify `orders/paid` webhook.
// Flow:
//   1. Verify HMAC signature.
//   2. If the order includes the mDOT variant, write the Shopify order ID to an
//      order metafield (used as the customer-facing “product key”).
//   3. Shopify notification email (Liquid) can output that metafield.
//
// No external key database — the order id is the key (idempotent on retries).

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/** Numeric id or full ProductVariant GID — must match line_items[].variant_id in webhooks */
const MDOT_VARIANT_GID = process.env.SHOPIFY_MDOT_VARIANT_GID ?? '46961502224515'
const WEBHOOK_SECRET    = process.env.SHOPIFY_WEBHOOK_SECRET ?? ''
const ADMIN_TOKEN       = process.env.SHOPIFY_ADMIN_TOKEN ?? ''
const STORE_DOMAIN      = process.env.SHOPIFY_STORE_DOMAIN ?? ''
const ADMIN_API_VERSION = '2026-04'

/** Metafield the email template should reference (e.g. order.metafields.custom.license_key) */
const METAFIELD_NAMESPACE = 'custom'
const METAFIELD_KEY       = 'license_key'

function verifyWebhook(rawBody: string, hmacHeader: string): boolean {
  if (!WEBHOOK_SECRET || !hmacHeader) return false
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest()
  const received = Buffer.from(hmacHeader, 'base64')
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(expected, received)
}

async function setOrderMetafield(orderId: string | number, value: string): Promise<void> {
  if (!ADMIN_TOKEN || !STORE_DOMAIN) {
    throw new Error('SHOPIFY_ADMIN_TOKEN and SHOPIFY_STORE_DOMAIN must be set')
  }
  const query = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
  `
  const variables = {
    metafields: [{
      namespace: METAFIELD_NAMESPACE,
      key:       METAFIELD_KEY,
      type:      'single_line_text_field',
      value,
      ownerId:   `gid://shopify/Order/${orderId}`,
    }],
  }

  const res = await fetch(
    `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method:  'POST',
      headers: {
        'Content-Type':           'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  )
  if (!res.ok) {
    throw new Error(`Admin API metafield set failed: ${res.status}`)
  }
  const json = await res.json() as {
    data?: { metafieldsSet?: { userErrors?: Array<{ message: string }> } }
  }
  const errors = json.data?.metafieldsSet?.userErrors ?? []
  if (errors.length > 0) {
    throw new Error(`Metafield userErrors: ${errors.map((e) => e.message).join(', ')}`)
  }
}

function matchesMdotVariant(variantId: number): boolean {
  if (!MDOT_VARIANT_GID) return false
  const variantIdStr = String(variantId)
  return (
    MDOT_VARIANT_GID === variantIdStr ||
    MDOT_VARIANT_GID.endsWith(`/${variantIdStr}`)
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()

  if (!WEBHOOK_SECRET) {
    console.error('[webhook/orders] SHOPIFY_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') ?? ''
  if (!verifyWebhook(rawBody, hmacHeader)) {
    console.warn('[webhook/orders] HMAC verification failed')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let order: {
    id: number
    email: string
    line_items: Array<{ variant_id: number; quantity: number; name: string }>
  }
  try {
    order = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const orderId    = order.id
  const orderEmail = order.email ?? ''

  const hasMdot = order.line_items.some((item) => matchesMdotVariant(item.variant_id))
  if (!hasMdot) {
    return NextResponse.json({ ok: true })
  }

  // Shopify order id (numeric string) is the product key
  const keyValue = String(orderId)

  try {
    await setOrderMetafield(orderId, keyValue)
  } catch (err) {
    console.error(`[webhook/orders] Metafield set failed for order ${orderId}:`, err)
    return NextResponse.json({ error: 'Metafield failed' }, { status: 500 })
  }

  console.log(
    `[webhook/orders] Order ${orderId}: set ${METAFIELD_NAMESPACE}.${METAFIELD_KEY} = ${keyValue} (${orderEmail})`,
  )

  return NextResponse.json({ ok: true })
}
