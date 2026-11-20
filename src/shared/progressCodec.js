// Converts Practice and Challenges progress to and from a compact form that
// fits in the signed-in user's Clerk account (account metadata is limited to
// a few kilobytes, so answers are packed one character per question).
//
// Packed shape: { v: 1, practice: { "<topicId>": "20-1" }, challenges: ["1.C1"] }
// In each practice string, position i is question number i + 1 in that topic,
// and the character is the checked answer choice, or "-" for not done.
// Only checked answers are saved to the account; Challenges notes stay on the device.
import { QUESTIONS } from '../practice/questions.js'
import { CHALLENGES } from '../practice/challengeQuestions.js'

export const PRACTICE_KEY = 'calc-practice-v1'
export const CHALLENGE_KEY = 'calc-challenges-v1'

const byId = new Map(QUESTIONS.map(q => [q.id, q]))
const byTopicNumber = new Map(QUESTIONS.map(q => [`${q.topicId}#${q.number}`, q]))
const challengeIds = new Set(CHALLENGES.map(c => c.id))

export function packProgress(practice, challenges) {
  const topics = {}
  for (const [id, item] of Object.entries(practice || {})) {
    const q = byId.get(id)
    if (!q || item?.checked !== true || !Number.isInteger(item.choice) || item.choice < 0 || item.choice > 9) continue
    const slots = (topics[q.topicId] ||= [])
    slots[q.number - 1] = String(item.choice)
  }
  const packedPractice = Object.fromEntries(Object.entries(topics).map(([topic, slots]) => [topic, Array.from(slots, c => c ?? '-').join('')]))
  const done = Object.entries(challenges || {}).filter(([id, value]) => value?.complete === true && challengeIds.has(id)).map(([id]) => id).sort()
  return { v: 1, practice: packedPractice, challenges: done }
}

export function unpackProgress(packed) {
  const practice = {}, challenges = new Set()
  if (!packed || packed.v !== 1) return { practice, challenges }
  for (const [topic, slots] of Object.entries(packed.practice || {})) {
    if (typeof slots !== 'string') continue
    ;[...slots].forEach((c, i) => {
      const q = byTopicNumber.get(`${topic}#${i + 1}`)
      const choice = Number(c)
      if (q && c !== '-' && Number.isInteger(choice) && choice >= 0 && choice < q.choices.length) practice[q.id] = { choice, checked: true }
    })
  }
  for (const id of Array.isArray(packed.challenges) ? packed.challenges : []) if (challengeIds.has(id)) challenges.add(id)
  return { practice, challenges }
}

// mode "merge": keep this device's progress and add the account's (first sign-in on a device).
// mode "replace": use only the account's progress (a different account used this browser before).
export function combineProgress(local, packed, mode) {
  const account = unpackProgress(packed)
  const practice = mode === 'replace' ? {} : { ...local.practice }
  for (const [id, item] of Object.entries(account.practice)) if (practice[id]?.checked !== true) practice[id] = item
  const challenges = {}
  for (const [id, value] of Object.entries(local.challenges || {})) {
    challenges[id] = { ...value, complete: mode === 'replace' ? account.challenges.has(id) : value?.complete === true || account.challenges.has(id) }
  }
  for (const id of account.challenges) if (!challenges[id]) challenges[id] = { notes: '', complete: true }
  return { practice, challenges }
}

function readJson(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '{}'); return value && typeof value === 'object' ? value : {} } catch { return {} }
}
export function readLocalProgress() {
  return { practice: readJson(PRACTICE_KEY), challenges: readJson(CHALLENGE_KEY) }
}
export function writeLocalProgress({ practice, challenges }) {
  localStorage.setItem(PRACTICE_KEY, JSON.stringify(practice))
  localStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenges))
}
