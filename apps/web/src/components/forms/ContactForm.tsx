'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Stub: replace with your real endpoint when ready.
      await new Promise((resolve) => setTimeout(resolve, 300))
      setIsSubmitted(true)
    } catch {
      setError('Could not submit form. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <p className='formSuccess'>Thanks - your message has been sent.</p>
  }

  return (
    <form onSubmit={onSubmit} className='form'>
      <div className='formField'>
        <label htmlFor='contact-name' className='formLabel'>Name</label>
        <input
          id='contact-name'
          name='name'
          type='text'
          required
          placeholder='Jhon Doe'
          className='formInput'
        />
      </div>
      <div className='formField'>
        <label htmlFor='contact-email' className='formLabel'>Email</label>
        <input
          id='contact-email'
          name='email'
          type='email'
          required
          placeholder='user@fbrrom.com'
          className='formInput'
        />
      </div>
      {error && <p className='formError'>{error}</p>}
      <button type='submit' disabled={isSubmitting} className='formSubmit'>
        <span>{isSubmitting ? 'Sending...' : 'Send'}</span>
      </button>
    </form>
  )
}