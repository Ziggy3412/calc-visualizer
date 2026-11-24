// Google Apps Script for the Calc Visualizer feedback sheet.
// Paste this into the sheet: Extensions → Apps Script, replace everything, save,
// then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
// Put the same SECRET in Vercel as FEEDBACK_SHEET_SECRET, and the web app URL
// as FEEDBACK_SHEET_URL.

const SECRET = 'PASTE_YOUR_SECRET_HERE'
const HEADERS = ['Sent', 'Rating', 'Message', 'Email', 'Visualizer', 'GitHub issue']

function doPost(e) {
  let data
  try { data = JSON.parse(e.postData.contents) } catch (err) { return reply('bad request') }
  if (!SECRET || SECRET === 'PASTE_YOUR_SECRET_HERE' || data.secret !== SECRET) return reply('forbidden')

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS)
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
  }
  sheet.appendRow([
    data.sent ? new Date(data.sent) : new Date(),
    data.rating || '',
    safe(data.message),
    safe(data.email),
    safe(data.page),
    safe(data.issueUrl),
  ])
  return reply('ok')
}

// Text starting with = + - or @ would be run as a formula; store it as plain text.
function safe(value) {
  const text = String(value || '').slice(0, 5000)
  return /^[=+\-@]/.test(text) ? "'" + text : text
}

function reply(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT)
}
