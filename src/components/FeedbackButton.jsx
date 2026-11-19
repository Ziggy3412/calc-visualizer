import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/react'
import { authEnabled, isWeb } from '../shared/auth'
import { dismissDialogOutside } from '../shared/dialogDismiss'
import './FeedbackButton.css'

const MAX_LENGTH = 2000

// Only rendered when Clerk is on, so useUser always has its provider.
function SignedInEmail({ onEmail }) {
  const { user } = useUser()
  const address = user?.primaryEmailAddress?.emailAddress
  useEffect(() => { if (address) onEmail(address) }, [address, onEmail])
  return null
}

export default function FeedbackButton({ currentTool }) {
  const dialogRef = useRef(null)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  // The feedback endpoint only exists on the website, not in the desktop app.
  if (!isWeb) return null

  function open() {
    if (status !== 'sending') { setStatus('idle'); setError('') }
    dialogRef.current.showModal()
  }

  async function submit(event) {
    event.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, email, website, page: currentTool || 'home' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setStatus('sent')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  return (
    <>
      {authEnabled && <SignedInEmail onEmail={setEmail} />}
      <button className="header-button library-button" aria-haspopup="dialog" onClick={open}>Feedback</button>
      <dialog aria-label="Send feedback" className="tool-dialog feedback-dialog" ref={dialogRef} onPointerDown={dismissDialogOutside}>
        <button className="dialog-close" aria-label="Close feedback" onClick={() => dialogRef.current.close()}>×</button>
        <h2>Send feedback</h2>
        {status === 'sent' ? (
          <div className="feedback-sent">
            <p>Thank you! Your feedback was sent.</p>
            <button type="button" className="feedback-submit" onClick={() => setStatus('idle')}>Send more</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="feedback-message">What is working, what is broken, or what would you like to see?</label>
            <textarea id="feedback-message" required minLength={3} maxLength={MAX_LENGTH} rows={6} value={message} onChange={e => setMessage(e.target.value)} />
            <span className="feedback-count">{message.length} / {MAX_LENGTH}</span>
            <label htmlFor="feedback-email">Email (optional, if you would like a reply)</label>
            <input id="feedback-email" type="email" maxLength={200} value={email} onChange={e => setEmail(e.target.value)} />
            <input className="feedback-trap" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={e => setWebsite(e.target.value)} />
            {status === 'error' && <p className="feedback-error" role="alert">{error}</p>}
            <button type="submit" className="feedback-submit" disabled={status === 'sending' || message.trim().length < 3}>
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </dialog>
    </>
  )
}
