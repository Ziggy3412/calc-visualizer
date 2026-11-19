// Accept ordinary decimals and scientific notation, including a typographic minus.
export function parseNumberDraft(raw, allowInfinity = false) {
  const text = raw.trim().replace(/−/g, '-')
  if(allowInfinity&&/^[+]?(?:∞|inf(?:inity)?)$/i.test(text))return Infinity
  if(allowInfinity&&/^-(?:∞|inf(?:inity)?)$/i.test(text))return -Infinity
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}
export function constrainNumber(value, min, max, step) {
  const lower = Number.isFinite(Number(min)) ? Number(min) : -Infinity
  const upper = Number.isFinite(Number(max)) ? Number(max) : Infinity
  let result = Math.max(lower, Math.min(upper, value))
  const spacing = Number(step)
  if (spacing > 0 && Number.isFinite(spacing)) {
    const origin = Number.isFinite(lower) ? lower : 0
    result = origin + Math.round((result - origin) / spacing) * spacing
  }
  return Number(Math.max(lower, Math.min(upper, result)).toPrecision(14))
}
