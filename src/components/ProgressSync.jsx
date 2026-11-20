import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/react'
import { PROGRESS_CHANGED, PROGRESS_SYNCED, setSyncStatus } from '../shared/progressEvents'

// Which account this browser's saved progress belongs to, so a second person
// signing in on the same browser does not inherit the first person's progress.
const OWNER_KEY = 'calc-progress-owner'
const SAVE_DELAY_MS = 1500

// Rendered inside ClerkProvider. Loads the signed-in account's problem progress
// into this device, then saves changes back to the account as they happen.
export default function ProgressSync() {
  const { isLoaded, isSignedIn, user } = useUser()
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user })
  const userId = user?.id

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !userId) { setSyncStatus('signed-out'); return }

    let cancelled = false, timer, codec, lastSaved = null, ready = false

    async function save() {
      clearTimeout(timer)
      if (!codec || cancelled) return
      const { practice, challenges } = codec.readLocalProgress()
      const packed = codec.packProgress(practice, challenges)
      const text = JSON.stringify(packed)
      if (text === lastSaved) { setSyncStatus('saved'); return }
      setSyncStatus('saving')
      try {
        const current = userRef.current
        await current.update({ unsafeMetadata: { ...current.unsafeMetadata, progress: packed } })
        lastSaved = text
        if (!cancelled) setSyncStatus('saved')
      } catch (error) {
        console.error('Could not save progress to the account', error)
        if (!cancelled) setSyncStatus('error')
      }
    }
    function scheduleSave() {
      if (!ready) return
      setSyncStatus('saving')
      clearTimeout(timer)
      timer = setTimeout(save, SAVE_DELAY_MS)
    }
    function saveNowIfHidden() { if (document.visibilityState === 'hidden' && ready) save() }

    setSyncStatus('saving')
    ;(async () => {
      try {
        codec = await import('../shared/progressCodec')
        if (cancelled) return
        const stored = userRef.current.unsafeMetadata?.progress
        lastSaved = stored ? JSON.stringify(stored) : null
        let owner = null
        try { owner = localStorage.getItem(OWNER_KEY) } catch { /* storage unavailable */ }
        const mode = owner && owner !== userId ? 'replace' : 'merge'
        try {
          codec.writeLocalProgress(codec.combineProgress(codec.readLocalProgress(), stored, mode))
          localStorage.setItem(OWNER_KEY, userId)
        } catch { /* storage unavailable: progress still saves from this session */ }
        window.dispatchEvent(new Event(PROGRESS_SYNCED))
        ready = true
        await save()
      } catch (error) {
        console.error('Could not load progress from the account', error)
        if (!cancelled) setSyncStatus('error')
      }
    })()

    window.addEventListener(PROGRESS_CHANGED, scheduleSave)
    document.addEventListener('visibilitychange', saveNowIfHidden)
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener(PROGRESS_CHANGED, scheduleSave)
      document.removeEventListener('visibilitychange', saveNowIfHidden)
    }
  }, [isLoaded, isSignedIn, userId])

  return null
}
