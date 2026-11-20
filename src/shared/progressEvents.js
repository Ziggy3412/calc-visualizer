// Small shared pieces for account progress sync. Kept separate from
// progressCodec.js so Practice and Challenges do not load the question bank twice.
import { useSyncExternalStore } from 'react'

export const PROGRESS_CHANGED = 'calc-progress-changed' // fired after Practice/Challenges save locally
export const PROGRESS_SYNCED = 'calc-progress-synced'   // fired after account progress is loaded into this device

export function notifyProgressChanged() {
  window.dispatchEvent(new Event(PROGRESS_CHANGED))
}

// Status: 'off' (login not enabled), 'signed-out', 'saving', 'saved', 'error'
let status = 'off'
const listeners = new Set()
export function setSyncStatus(next) {
  if (next === status) return
  status = next
  listeners.forEach(listener => listener())
}
export function useSyncStatus() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener) }, () => status)
}
