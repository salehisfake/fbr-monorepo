'use client'

import { useState } from 'react'

interface NewsletterFormProps {
  heading?: string
  subheading?: string
  ctaLabel?: string
  successMessage?: string
  legalText?: string
  source?: string
  onAnalyticsEvent?: (eventName: string, payload: Record<string, string>) => void
}

export default function NewsletterForm({
  heading = 'Join the newsletter',
  subheading = 'Get occasional updates on releases, events, and projects.',
  ctaLabel = 'Subscribe',
  successMessage = 'You are subscribed. Welcome to the list.',
  legalText = 'No spam. Unsubscribe any time.',
  source = 'bookings-page',
  onAnalyticsEvent,
}: NewsletterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function emitAnalytics(eventName: string, payload: Record<string, string>) {
    onAnalyticsEvent?.(eventName, payload)
    if (typeof window === 'undefined') return

    window.dispatchEvent(new CustomEvent('fbr:newsletter', { detail: { eventName, ...payload } }))

    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
    if (typeof gtag === 'function') {
      gtag('event', eventName, payload)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const email = String(formData.get('email') ?? '').trim()
      const website = String(formData.get('website') ?? '').trim()
      emitAnalytics('newsletter_attempt', { source })

      // Honeypot field: likely bot traffic.
      if (website) {
        emitAnalytics('newsletter_honeypot_blocked', { source })
        setIsSubmitted(true)
        return
      }

      const res = await fetch('/api/forms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (!res.ok) throw new Error('subscribe-failed')
      emitAnalytics('newsletter_conversion', { source })
      setIsSubmitted(true)
    } catch {
      emitAnalytics('newsletter_failure', { source })
      setError('Could not subscribe right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <p className='formSuccess'>{successMessage}</p>
  }

  return (
    <form onSubmit={onSubmit} className='form'>
      <div className='formHeader'>
        <p className='formHeading'>{heading}</p>
        <p className='formSubheading'>{subheading}</p>
      </div>
      <div className='formRow'>
        <input
          id='newsletter-email'
          name='email'
          type='email'
          required
          placeholder='user@fbrrom.com'
          className='formInput'
          aria-label='Email address'
        />
        <input
          type='text'
          name='website'
          tabIndex={-1}
          autoComplete='off'
          className='formHoneypot'
          aria-hidden='true'
        />
        <button type='submit' disabled={isSubmitting} className='formSubmit'>
          <span>{isSubmitting ? 'Subscribing...' : ctaLabel}</span>
          <span className='formArrow' aria-hidden='true'>↗</span>
        </button>
      </div>
      <p className='formLegal'>{legalText}</p>
      {error && <p className='formError'>{error}</p>}
    </form>
  )
}
