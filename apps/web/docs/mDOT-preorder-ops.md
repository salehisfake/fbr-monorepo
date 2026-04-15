---
title: mDOT Preorder — Operations Guide
updated: 2026-04-14
---

# mDOT Preorder — Operations Guide

This doc covers everything needed to keep the mDOT preorder system running after launch.

---

## How the system works

```
User clicks "Add to cart" in post
  → Store flyout opens (menubar bag icon)
  → User clicks "Purchase"
  → Shopify Storefront API creates cart + returns checkoutUrl
  → Browser redirects to Shopify Checkout
  → Customer pays
  → Shopify fires orders/paid webhook to /api/shopify/webhooks/orders
  → Webhook writes order id to order metafield (custom.license_key)
  → Shopify sends notification email containing the key
```

---

## Environment variables

All live in `apps/web/.env.local` (dev) and your deployment platform (prod).

| Variable | What it is | Where to get it |
|----------|-----------|-----------------|
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | Store host | Shopify Admin URL, e.g. `fbr-shop-3.myshopify.com` |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` | Public cart/checkout token | App → Configuration → Storefront API access token |
| `NEXT_PUBLIC_SHOPIFY_MDOT_VARIANT_GID` | Full GID used by cart | `gid://shopify/ProductVariant/<id>` |
| `SHOPIFY_STORE_DOMAIN` | Same store host (server-side) | Same as above |
| `SHOPIFY_ADMIN_TOKEN` | Server-only admin token | App → Configuration → Admin API access token |
| `SHOPIFY_WEBHOOK_SECRET` | Webhook signing secret | App → Webhooks → your subscription → signing secret |
| `SHOPIFY_MDOT_VARIANT_GID` | Numeric variant id (webhook filter) | Product → variant → numeric id |

Current store: `fbr-shop-3.myshopify.com`  
Current variant: `46961502224515`

---

## Shopify admin — things to keep in place

### Custom app
- **App**: must stay installed and active on the store.
- **Storefront API scopes**: cart / checkout access.
- **Admin API scopes**: read + write orders, metafields.
- If you regenerate tokens → update env vars + redeploy.

### Product
- Product must be **Active** and available on **Online Store**.
- Variant id **must not change**. If you delete/recreate the variant, update:
  - `NEXT_PUBLIC_SHOPIFY_MDOT_VARIANT_GID`
  - `SHOPIFY_MDOT_VARIANT_GID`
  - both in prod env, then redeploy.

### Webhook
- Topic: `orders/paid`
- API version: `2026-04`
- URL: `https://YOUR_PROD_DOMAIN/api/shopify/webhooks/orders`
- If signing secret rotates → update `SHOPIFY_WEBHOOK_SECRET` + redeploy.

### Order metafield definition
- Namespace: `custom` / Key: `license_key` / Type: Single line text.
- Must stay defined on Orders — deleting it breaks metafield writes.

### Notification email template
- Liquid in order confirmation email outputs `order.metafields.custom.license_key`.
- Test with a test order after any template edit.

---

## Deployment checklist

Before going live, ensure all env vars are set in your production host (Vercel, Fly, etc.):

```
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
NEXT_PUBLIC_SHOPIFY_MDOT_VARIANT_GID
SHOPIFY_STORE_DOMAIN
SHOPIFY_ADMIN_TOKEN
SHOPIFY_WEBHOOK_SECRET
SHOPIFY_MDOT_VARIANT_GID
```

Update the Shopify webhook URL to your production domain before launch.

---

## Testing the webhook

Script: `apps/web/scripts/test-shopify-webhook.ps1`

Reads `SHOPIFY_WEBHOOK_SECRET` from `apps/web/.env.local` automatically.

```powershell
cd apps/web

# Against tunnel (dev)
.\scripts\test-shopify-webhook.ps1

# Against localhost
$env:WEBHOOK_TEST_URL = "http://localhost:3000/api/shopify/webhooks/orders"
.\scripts\test-shopify-webhook.ps1

# Against prod
$env:WEBHOOK_TEST_URL = "https://your-prod-domain.com/api/shopify/webhooks/orders"
.\scripts\test-shopify-webhook.ps1
```

**Expected**: `Status: 200` / `Body: {"ok":true}`

After a successful test, check the Shopify order (id `9876543210` in the test) and confirm metafield `custom.license_key` = `9876543210`.

---

## Local dev tunnel

The store flyout and checkout flow work without a tunnel — they call Shopify directly from the browser.

The tunnel is only needed so **Shopify can reach your webhook** during dev testing.

```powershell
# Terminal 1 — app
cd apps/web
pnpm dev

# Terminal 2 — tunnel
cloudflared tunnel --url http://localhost:3000
```

Tunnel URL changes on every restart. When it does:
1. Update the webhook URL in Shopify App → Webhooks.
2. Optionally update `$webhookUrl` default in the test script.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Cart flyout shows "Coming soon" | `NEXT_PUBLIC_SHOPIFY_MDOT_VARIANT_GID` not set | Add to env, restart dev |
| Add to cart fails silently | Wrong/missing Storefront token or domain | Check `NEXT_PUBLIC_*` vars |
| Checkout button missing / broken | Cart not created (Storefront API error) | Check browser console for fetch errors |
| Webhook 401 | `SHOPIFY_WEBHOOK_SECRET` mismatch | Must match Shopify's signing secret exactly; restart after changing |
| Webhook 500 Metafield failed | Admin token expired, wrong scopes, or metafield definition deleted | Regenerate token or recreate metafield definition |
| Email missing key | Email sent before metafield written | Order confirmation fires before webhook completes; either accept the delay (key appears on order page) or use a fulfillment-triggered email instead |
| Key missing on Shopify order page | Metafield definition deleted | Recreate in Settings → Custom data → Orders |

---

## Rotating secrets / tokens

If you regenerate any Shopify token:

1. Update `apps/web/.env.local` (dev) and prod platform env.
2. Restart dev server / redeploy prod.
3. Re-run webhook test script to confirm.

If you rotate the **webhook signing secret**:

1. Update `SHOPIFY_WEBHOOK_SECRET` in env.
2. Restart / redeploy.
3. Shopify retries failed webhooks — they will succeed after the secret is live.

---

## Key files

| File | What it does |
|------|-------------|
| `apps/web/src/lib/shopify.ts` | Storefront GraphQL client (cart, checkout) |
| `apps/web/src/components/desktop/StoreFlyout.tsx` | Flyout UI — product card + cart + Purchase |
| `apps/web/src/components/store/PreorderCTA.tsx` | "Add to cart" button embedded in posts |
| `apps/web/src/components/desktop/useCartStore.ts` | Zustand cart state (persisted to localStorage) |
| `apps/web/src/app/api/shopify/webhooks/orders/route.ts` | `orders/paid` webhook handler |
| `apps/web/src/content/posts/mdot.mdx` | mDOT post content |
| `apps/web/scripts/test-shopify-webhook.ps1` | Webhook test script |
| `apps/web/.env.example` | Full list of env vars with descriptions |
