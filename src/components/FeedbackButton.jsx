import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/react'
import { authEnabled, isWeb } from '../shared/auth'
import { dismissDialogOutside } from '../shared/dialogDismiss'
import './FeedbackButton.css'

const MAX_LENGTH = 2000
const RATING_LABELS = ['', 'Not useful', 'Needs work', 'It is okay', 'Pretty good', 'Love it']

// Only rendered when Clerk is on, so useUser always has its provider.
function SignedInEmail({ onEmail }) {
  const { user } = useUser()
  const address = user?.primaryEmailAddress?.emailAddress
  useEffect(() => { if (address) onEmail(address) }, [address, onEmail])
  return null
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="feedback-rating">
      <div className="feedback-stars" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`feedback-star ${n <= shown ? 'filled' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(value === n ? 0 : n)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" /></svg>
          </button>
        ))}
      </div>
      <span className="feedback-rating-label">{shown ? RATING_LABELS[shown] : 'Tap a star'}</span>
    </div>
  )
}

export default function FeedbackButton({ currentTool }) {
  const dialogRef = useRef(null)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  // The feedback endpoint only exists on the website, not in the desktop app.
  if (!isWeb) return null

  const canSend = rating > 0 || message.trim().length >= 3

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
        body: JSON.stringify({ rating: rating || null, message, email, website, page: currentTool || 'home' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setStatus('sent')
      setMessage('')
      setRating(0)
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
        {status === 'sent' ? (
          <div className="feedback-sent">
            <h2>Thank you!</h2>
            <p>Your feedback was sent.</p>
            <div className="feedback-actions">
              <button type="button" className="feedback-secondary" onClick={() => setStatus('idle')}>Send more</button>
              <button type="button" className="feedback-submit" onClick={() => dialogRef.current.close()}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <header className="feedback-head">
              <h2>How is Calc Visualizer?</h2>
              <p>Leave a rating, a message, or both.</p>
            </header>

            <StarRating value={rating} onChange={setRating} />

            <div className="feedback-field">
              <label htmlFor="feedback-message">Tell us more <span>(optional)</span></label>
              <textarea id="feedback-message" maxLength={MAX_LENGTH} rows={5} placeholder="What is working, what is broken, or what would you like to see?" value={message} onChange={e => setMessage(e.target.value)} />
              {message.length > MAX_LENGTH * 0.8 && <span className="feedback-count">{message.length} / {MAX_LENGTH}</span>}
            </div>

            <div className="feedback-field">
              <label htmlFor="feedback-email">Email <span>(optional, if you would like a reply)</span></label>
              <input id="feedback-email" type="email" maxLength={200} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <input className="feedback-trap" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={e => setWebsite(e.target.value)} />

            {status === 'error' && <p className="feedback-error" role="alert">{error}</p>}

            <div className="feedback-actions">
              <button type="submit" className="feedback-submit" disabled={status === 'sending' || !canSend}>
                {status === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
