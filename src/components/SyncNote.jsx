import { useSyncStatus } from '../shared/progressEvents'

const MESSAGES = {
  'signed-out': 'Sign in to save your progress to your account.',
  saving: 'Saving to your account…',
  saved: 'Progress saved to your account.',
  error: 'Could not save to your account. Your progress is still saved on this device.',
}

// One line under the Practice/Challenges heading showing account sync state.
export default function SyncNote() {
  const status = useSyncStatus()
  if (!MESSAGES[status]) return null
  return <p className={`sync-note sync-note-${status}`} role="status">{MESSAGES[status]}</p>
}
