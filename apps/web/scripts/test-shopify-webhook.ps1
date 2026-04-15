# Test POST to orders/paid webhook with a valid Shopify-style HMAC.
#
# IMPORTANT: The secret must match apps/web/.env.local → SHOPIFY_WEBHOOK_SECRET
# (same value Shopify shows for the webhook). If you only set it in this shell
# but Next uses a different value from .env, verification will fail.
#
# PowerShell must send the EXACT UTF-8 bytes used for the HMAC. Using -Body [string]
# can use the wrong encoding; we sign and send the same byte array.
#
# Usage (from apps/web):
#   .\scripts\test-shopify-webhook.ps1
#
# Optional: $env:WEBHOOK_TEST_URL, $env:SHOPIFY_MDOT_VARIANT_NUMERIC, $env:SHOPIFY_STORE_DOMAIN

$webhookUrl = if ($env:WEBHOOK_TEST_URL) {
  $env:WEBHOOK_TEST_URL
} else {
  "https://slightly-foods-briefing-consumption.trycloudflare.com/api/shopify/webhooks/orders"
}

# Prefer .env.local so it matches what `pnpm dev` loads (same as Next.js process)
$secret = $null
$envLocal = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envLocal) {
  Get-Content $envLocal | ForEach-Object {
    if ($_ -match '^\s*SHOPIFY_WEBHOOK_SECRET\s*=\s*(.+)\s*$') {
      $secret = $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
}
if (-not $secret) { $secret = $env:SHOPIFY_WEBHOOK_SECRET }
if (-not $secret) {
  throw "Set SHOPIFY_WEBHOOK_SECRET in apps/web/.env.local or `$env:SHOPIFY_WEBHOOK_SECRET (must match Shopify webhook signing secret)."
}

$variantId = if ($env:SHOPIFY_MDOT_VARIANT_NUMERIC) {
  [long]$env:SHOPIFY_MDOT_VARIANT_NUMERIC
} else {
  46961502224515
}

$shopDomain = if ($env:SHOPIFY_STORE_DOMAIN) { $env:SHOPIFY_STORE_DOMAIN } else { "fbr-shop-3.myshopify.com" }

$payloadObject = @{
  id    = 9876543210
  email = "testbuyer@example.com"
  line_items = @(
    @{
      variant_id = $variantId
      quantity   = 1
      name       = "mDOT Preorder"
    }
  )
}

$payload = $payloadObject | ConvertTo-Json -Depth 10 -Compress
$utf8 = [Text.Encoding]::UTF8
$payloadBytes = $utf8.GetBytes($payload)

$hmac = [Convert]::ToBase64String(
  ([System.Security.Cryptography.HMACSHA256]::new($utf8.GetBytes($secret))).ComputeHash($payloadBytes)
)

$headers = @{
  "X-Shopify-Hmac-Sha256" = $hmac
  "X-Shopify-Topic"       = "orders/paid"
  "X-Shopify-Shop-Domain" = $shopDomain
}

Write-Host "POST $webhookUrl"
try {
  $response = Invoke-WebRequest -Method POST -Uri $webhookUrl -Headers $headers -Body $payloadBytes -ContentType 'application/json; charset=utf-8'
  Write-Host "Status:" $response.StatusCode
  Write-Host "Body:" $response.Content
} catch {
  $err = $_.Exception.Response
  if ($err) {
    $reader = [System.IO.StreamReader]::new($err.GetResponseStream())
    Write-Host "Status:" ([int]$err.StatusCode)
    Write-Host "Body:" $reader.ReadToEnd()
  } else {
    throw
  }
}
