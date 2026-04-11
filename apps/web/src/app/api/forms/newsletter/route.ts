import { NextResponse } from 'next/server'

interface NewsletterBody {
  email?: string
  source?: string
}

type NewsletterEventType =
  | 'attempt'
  | 'invalid_email'
  | 'honeypot'
  | 'kit_success'
  | 'kit_failure'
  | 'config_missing'

interface NewsletterLogEvent {
  at: string
  type: NewsletterEventType
  source: string
  email: string
}

const MAX_LOG_EVENTS = 200
const newsletterLog: NewsletterLogEvent[] = []

function maskEmail(value: string): string {
  const [local = '', domain = ''] = value.split('@')
  if (!local || !domain) return 'invalid'
  const head = local.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`
}

function logEvent(type: NewsletterEventType, source: string, email: string) {
  newsletterLog.unshift({
    at: new Date().toISOString(),
    type,
    source,
    email: maskEmail(email),
  })
  if (newsletterLog.length > MAX_LOG_EVENTS) newsletterLog.length = MAX_LOG_EVENTS
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as NewsletterBody
  const email = String(body.email ?? '').trim().toLowerCase()
  const source = String(body.source ?? 'unknown').trim()
  logEvent('attempt', source, email)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    logEvent('invalid_email', source, email)
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const apiKey = process.env.KIT_API_KEY?.trim()
  const formIdRaw = process.env.KIT_FORM_ID?.trim() ?? ''
  const formId = formIdRaw.replace(/^["']|["']$/g, '')
  if (!apiKey || !/^\d+$/.test(formId)) {
    logEvent('config_missing', source, email)
    return NextResponse.json({ error: 'Newsletter is not configured' }, { status: 503 })
  }

  // Kit v4: upsert subscriber first, then add subscriber to form.
  const createSubscriberRes = await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    },
    body: JSON.stringify({
      email_address: email,
      fields: {
        Source: source,
      },
    }),
    cache: 'no-store',
  })

  if (!createSubscriberRes.ok) {
    const details = await createSubscriberRes.text().catch(() => '')
    logEvent('kit_failure', source, email)
    return NextResponse.json(
      {
        error: 'Could not create subscriber in Kit',
        details: details || undefined,
      },
      { status: 502 },
    )
  }

  const createSubscriberJson = (await createSubscriberRes.json().catch(() => null)) as
    | { subscriber?: { id?: number } }
    | null
  if (!createSubscriberJson?.subscriber?.id) {
    logEvent('kit_failure', source, email)
    return NextResponse.json({ error: 'Kit did not return a subscriber id' }, { status: 502 })
  }

  // Attach to the Kit form by email (same outcome as POST …/subscribers/:id, avoids id/URL edge cases).
  // https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address
  const referrer = `https://fbrrom.com/newsletter?source=${encodeURIComponent(source)}`
  const addToFormRes = await fetch(`https://api.kit.com/v4/forms/${formId}/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    },
    body: JSON.stringify({
      email_address: email,
      referrer,
    }),
    cache: 'no-store',
  })

  if (!addToFormRes.ok) {
    const details = await addToFormRes.text().catch(() => '')
    logEvent('kit_failure', source, email)
    return NextResponse.json(
      {
        error: 'Could not add subscriber to Kit form',
        details: details || undefined,
      },
      { status: 502 },
    )
  }

  logEvent('kit_success', source, email)
  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const adminKey = process.env.NEWSLETTER_ADMIN_LOG_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'Admin log key is not configured' }, { status: 503 })
  }

  const key = req.headers.get('x-admin-log-key')
  if (key !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const counts = newsletterLog.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    total: newsletterLog.length,
    counts,
    events: newsletterLog,
  })
}
