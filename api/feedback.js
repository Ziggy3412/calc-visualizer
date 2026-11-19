// Vercel serverless function: saves each piece of feedback as an issue in a
// private GitHub repo, so it can be read (and emailed) from GitHub.
//
// Needs two environment variables in Vercel:
//   FEEDBACK_GITHUB_TOKEN  fine-grained token with Issues: Read and write on the repo
//   FEEDBACK_GITHUB_REPO   e.g. Ziggy3412/calc-visualizer-feedback

const MAX_LENGTH = 2000
const RATE_LIMIT = 5 // submissions per IP per window (best effort, per server instance)
const RATE_WINDOW_MS = 10 * 60 * 1000
const recent = new Map()

function tooMany(ip) {
  const now = Date.now()
  const times = (recent.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS)
  times.push(now)
  recent.set(ip, times)
  return times.length > RATE_LIMIT
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })

  const token = process.env.FEEDBACK_GITHUB_TOKEN
  const repo = process.env.FEEDBACK_GITHUB_REPO
  if (!token || !repo) return res.status(503).json({ error: 'Feedback is not set up yet.' })

  let body = req.body || {}
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid request.' }) }
  }

  // Hidden field that people never see; bots that fill in every field trip it.
  if (body.website) return res.status(200).json({ ok: true })

  const message = String(body.message || '').trim()
  const email = String(body.email || '').trim().slice(0, 200)
  const page = String(body.page || '').trim().slice(0, 100)
  const rating = Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5 ? body.rating : null
  // A star rating alone is fine; a message alone is fine; at least one is needed.
  if (!rating && message.length < 3) return res.status(400).json({ error: 'Please pick a star rating or write a message.' })
  if (message.length > MAX_LENGTH) return res.status(400).json({ error: `Please keep it under ${MAX_LENGTH} characters.` })

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (tooMany(ip)) return res.status(429).json({ error: 'Too many messages. Please try again later.' })

  const stars = rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : ''
  const firstLine = message.split('\n')[0]
  const snippet = firstLine.length > 60 ? firstLine.slice(0, 60) + '…' : firstLine
  const title = [stars && `${stars} (${rating}/5)`, snippet || (rating && 'rating only')].filter(Boolean).join(' · ')
  const details = [
    rating && `**Rating:** ${rating}/5`,
    `**From:** ${email || 'anonymous'}`,
    page && `**Visualizer:** ${page}`,
    `**Sent:** ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n')

  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'calc-visualizer-feedback',
    },
    body: JSON.stringify({ title: `Feedback: ${title}`, body: `${message || '_No written feedback._'}\n\n---\n${details}` }),
  })

  if (!response.ok) {
    console.error('GitHub issue creation failed', response.status, await response.text())
    return res.status(502).json({ error: 'Could not save feedback. Please try again later.' })
  }
  return res.status(200).json({ ok: true })
}
