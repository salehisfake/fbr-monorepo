// apps/web/src/app/api/shopify/webhooks/orders/route.ts
//
// Handles Shopify `orders/paid` webhook.
// Flow:
//   1. Verify HMAC signature.
//   2. Check idempotency (skip already-processed orders).
//   3. For mDOT line items, claim unique license key(s) from the DB.
//   4. Write key(s) to the order as a Shopify metafield.
//   5. Shopify's notification email (configured with Liquid) delivers the key.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServerClient, type LicenseKey } from '@/lib/supabase-server'

const MDOT_VARIANT_GID  = process.env.SHOPIFY_MDOT_VARIANT_GID   // numeric or GID
const WEBHOOK_SECRET    = process.env.SHOPIFY_WEBHOOK_SECRET  ?? ''
const ADMIN_TOKEN       = process.env.SHOPIFY_ADMIN_TOKEN     ?? ''
const STORE_DOMAIN      = process.env.SHOPIFY_STORE_DOMAIN    ?? ''   // server-side (no NEXT_PUBLIC_)
const ADMIN_API_VERSION = '2024-10'

// ── HMAC verification ─────────────────────────────────────────────────────────

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

// ── Shopify Admin API ─────────────────────────────────────────────────────────

async function setOrderMetafield(
  orderId: string | number,
  value: string,
): Promise<void> {
  const query = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
  `
  const variables = {
    metafields: [{
      namespace: 'custom',
      key:       'license_key',
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
        'Content-Type':          'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  )
  if (!res.ok) {
    throw new Error(`Admin API metafield set failed: ${res.status}`)
  }
  const json = await res.json() as { data?: { metafieldsSet?: { userErrors?: Array<{ message: string }> } } }
  const errors = json.data?.metafieldsSet?.userErrors ?? []
  if (errors.length > 0) {
    throw new Error(`Metafield userErrors: ${errors.map((e) => e.message).join(', ')}`)
  }
}

// ── Key claiming ──────────────────────────────────────────────────────────────

/**
 * Atomically claim N unclaimed keys for an order.
 * Note: for high-concurrency production systems, use a Postgres advisory lock
 * or a DB function with SELECT ... FOR UPDATE SKIP LOCKED to prevent races.
 */
async function claimKeys(
  orderId: string,
  email: string,
  quantity: number,
): Promise<string[]> {
  const supabase = getSupabaseServerClient()

  const { data: unclaimed, error: selectErr } = await supabase
    .from('license_keys')
    .select('id, key')
    .is('order_id', null)
    .limit(quantity) as unknown as {
      data:  Pick<LicenseKey, 'id' | 'key'>[] | null
      error: { message: string } | null
    }

  if (selectErr) throw new Error(`DB select failed: ${selectErr.message}`)
  if (!unclaimed || unclaimed.length < quantity) {
    throw new Error(
      `Insufficient keys: need ${quantity}, have ${unclaimed?.length ?? 0}`,
    )
  }

  const ids = unclaimed.map((k) => k.id)
  const { error: updateErr } = await supabase
    .from('license_keys')
    .update({
      order_id:   orderId,
      email,
      claimed_at: new Date().toISOString(),
    })
    .in('id', ids) as unknown as {
      data:  LicenseKey[] | null
      error: { message: string } | null
    }

  if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`)

  return unclaimed.map((k) => k.key)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read raw body — must happen before any JSON parsing for HMAC to work.
  const rawBody = await req.text()

  // 1. Verify HMAC
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') ?? ''
  if (!verifyWebhook(rawBody, hmacHeader)) {
    console.warn('[webhook/orders] HMAC verification failed')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse order payload
  let order: {
    id: number
    email: string
    line_items: Array<{
      variant_id: number
      quantity: number
      name: string
    }>
  }
  try {
    order = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const orderId    = String(order.id)
  const orderEmail = order.email ?? ''

  // 3. Idempotency — skip if already processed
  const supabase = getSupabaseServerClient()
  const { data: existing } = await supabase
    .from('license_keys')
    .select('id')
    .eq('order_id', orderId)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`[webhook/orders] Order ${orderId} already processed — skipping`)
    return NextResponse.json({ ok: true })
  }

  // 4. Find mDOT line items
  const mdotLines = order.line_items.filter((item) => {
    if (!MDOT_VARIANT_GID) return false
    // MDOT_VARIANT_GID may be numeric ("12345") or a GID ("gid://shopify/ProductVariant/12345")
    const variantIdStr = String(item.variant_id)
    return (
      MDOT_VARIANT_GID === variantIdStr ||
      MDOT_VARIANT_GID.endsWith(`/${variantIdStr}`)
    )
  })

  if (mdotLines.length === 0) {
    // Not an mDOT order; nothing to do
    return NextResponse.json({ ok: true })
  }

  const totalQty = mdotLines.reduce((sum, l) => sum + l.quantity, 0)

  // 5. Claim keys from DB
  let keys: string[]
  try {
    keys = await claimKeys(orderId, orderEmail, totalQty)
  } catch (err) {
    // Log and return 200 so Shopify doesn't retry endlessly.
    // Manual intervention required: check DB key pool.
    console.error(`[webhook/orders] Key claim failed for order ${orderId}:`, err)
    return NextResponse.json({ ok: true, warning: 'key_claim_failed' })
  }

  // 6. Write key(s) to Shopify order metafield
  const keyValue = keys.join('\n')
  try {
    await setOrderMetafield(orderId, keyValue)
  } catch (err) {
    // Keys are claimed in DB but metafield write failed.
    // Admin can retrieve the key from the DB and resend manually.
    console.error(`[webhook/orders] Metafield set failed for order ${orderId}:`, err)
  }

  console.log(
    `[webhook/orders] Order ${orderId}: issued ${keys.length} key(s) to ${orderEmail}`,
  )

  return NextResponse.json({ ok: true })
}
