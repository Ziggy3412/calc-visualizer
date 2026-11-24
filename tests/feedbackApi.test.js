import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/feedback.js'

const ENV = ['FEEDBACK_GITHUB_TOKEN', 'FEEDBACK_GITHUB_REPO', 'FEEDBACK_SHEET_URL', 'FEEDBACK_SHEET_SECRET']
let ip = 0
function run(body, env, fetchImpl) {
  for (const key of ENV) delete process.env[key]
  Object.assign(process.env, env)
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return fetchImpl(url) }
  const res = { code: 0, out: null, status(c) { this.code = c; return this }, json(o) { this.out = o; return this } }
  return handler({ method: 'POST', headers: { 'x-forwarded-for': `10.0.0.${++ip}` }, body }, res).then(() => ({ res, calls }))
}
const github = { FEEDBACK_GITHUB_TOKEN: 't', FEEDBACK_GITHUB_REPO: 'a/b' }
const sheet = { FEEDBACK_SHEET_URL: 'https://script.google.com/x/exec', FEEDBACK_SHEET_SECRET: 's' }
const ok = url => url.includes('github') ? { ok: true, json: async () => ({ html_url: 'https://github.com/a/b/issues/7' }) } : { ok: true, text: async () => 'ok' }

test('not set up', async () => {
  const { res } = await run({ rating: 5 }, {}, ok)
  assert.equal(res.code, 503)
})
test('GitHub and sheet both get the feedback, with the issue link in the row', async () => {
  const { res, calls } = await run({ rating: 4, message: 'Nice', email: 'a@b.c', page: 'polar' }, { ...github, ...sheet }, ok)
  assert.equal(res.code, 200)
  assert.equal(calls.length, 2)
  assert.deepEqual({ ...calls[1].body, sent: 'x' }, { secret: 's', sent: 'x', rating: 4, message: 'Nice', email: 'a@b.c', page: 'polar', issueUrl: 'https://github.com/a/b/issues/7' })
})
test('sheet only works without GitHub', async () => {
  const { res, calls } = await run({ rating: 3 }, sheet, ok)
  assert.equal(res.code, 200)
  assert.equal(calls.length, 1)
})
test('a sheet failure does not lose feedback that reached GitHub', async () => {
  const { res } = await run({ rating: 2 }, { ...github, ...sheet }, url => url.includes('github') ? ok(url) : { ok: true, text: async () => 'forbidden' })
  assert.equal(res.code, 200)
})
test('fails when nothing could be saved', async () => {
  const { res } = await run({ rating: 2 }, { ...github, ...sheet }, url => url.includes('github') ? { ok: false, status: 500, text: async () => 'x' } : { ok: true, text: async () => 'forbidden' })
  assert.equal(res.code, 502)
})
