// Shared expression helpers used by the function input.
//
// Desmos lets you type a function many different ways and treats them all the
// same. The goal here is: whatever the user types on the LEFT of an equals
// sign that just *names* the function (like "f(x) =" or "y ="), we throw away,
// and keep only the RIGHT side — the actual expression math.js should evaluate.

// stripLHS("f(x) = x^2")  ->  "x^2"
// stripLHS("g(t) = sin(t)") -> "sin(t)"
// stripLHS("y = x^2")     ->  "x^2"
// stripLHS("x^2")         ->  "x^2"        (bare expression, unchanged)
// stripLHS("x^2 + y^2 = 25") -> "x^2 + y^2 = 25"  (implicit equation, NOT a name = so left alone)
export function stripLHS(input) {
  if (input == null) return input
  const s = String(input).trim()
  if (!s) return s

  // Match a "declaration" left-hand side at the very start of the string:
  //   - a single name like  y   or  f
  //   - optionally followed by a parenthesised variable list like  (x)  or  (x, y)
  //   - then a single "=" that is NOT part of "==", "<=", ">=" or "!="
  // We deliberately require the left side to be JUST a name (and optional args).
  // Something like "x^2 + y^2 = 25" has math on the left, so it does NOT match
  // and is returned unchanged (that's an implicit equation, handled elsewhere).
  const decl = /^[a-zA-Z][a-zA-Z0-9]*\s*(\([^)]*\))?\s*=(?![=])\s*(.*)$/
  const m = s.match(decl)
  if (m) {
    // x = … is a vertical relation; y on both sides also stays implicit.
    if (/^x\s*=/.test(s) || (/^y\s*=/.test(s) && /\by\b/.test(m[2]))) return s
    // m[2] is everything after the "=" — the real expression.
    return m[2].trim()
  }
  return s
}

// Normalize an expression so math.js can evaluate what the user typed:
//   • strip a "f(x) =" / "y =" left-hand side (see stripLHS)
//   • Unicode θ → "theta" (math.js only knows the word)
//   • ln(...) → log(...)  — math.js calls the natural log "log", so without
//     this, typing ln(1+x) would silently fail to plot
// MathLive emits fractions as (a)/(b)c. Make juxtaposition after a closing
// parenthesis explicit so math.js cannot absorb c into the denominator.
//   • |x| → abs(x) — math.js has no absolute-value bars, only abs()
//   • sin x → sin(x), sin^2 x → (sin(x))^2, log_2 x → log(x, 2) — see functionArguments
export function normalizeMathAscii(input) {
  return functionArguments(absoluteBars(String(input)).replace(/θ/g, 'theta')).replace(/\bln\b/g, 'log').replace(/\)\s*(?=[A-Za-z0-9_(])/g, ')*')
}

// Turn absolute-value bars into abs(...). A bar closes the most recent open
// bar when it comes right after a value (x, 2, a closing bracket, …) at the
// same bracket depth; otherwise it opens a new one. That reads |x-1|+|x|,
// ||x|-1| and (|x|)/(x) the way they are written. Unmatched bars are left
// alone so math.js still reports the expression as incomplete.
//   absoluteBars("|x|")        -> "abs(x)"
//   absoluteBars("2|x|")       -> "2*abs(x)"
//   absoluteBars("||x|-1|")    -> "abs(abs(x)-1)"
const FUNCTION_NAMES = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'exp', 'sqrt'])
export function absoluteBars(input) {
  const s = String(input)
  if (!s.includes('|')) return s
  let out = '', depth = 0
  const open = [] // { depth inside abs(, extra closing brackets }
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (ch === '|') {
      const trimmed = out.trimEnd()
      const prev = trimmed.slice(-1)
      const afterValue = /[A-Za-z0-9_.)\]!']/.test(prev)
      const word = trimmed.match(/([A-Za-z]+)$/)?.[1]
      if (open.length && open.at(-1).depth === depth && afterValue) {
        out += ')'.repeat(1 + open.pop().extra)
        depth--
      } else if (word && FUNCTION_NAMES.has(word)) {
        // sin |x|  ->  sin(abs(x))
        out = trimmed + '(abs('
        depth++
        open.push({ depth, extra: 1 })
      } else {
        out += (afterValue ? '*' : '') + 'abs('
        depth++
        open.push({ depth, extra: 0 })
      }
      continue
    }
    out += ch
  }
  return open.length ? s : out
}
export function normalizeExpr(input) {
  const s = stripLHS(input)
  return s ? normalizeMathAscii(s) : s
}

// The math box writes functions the way people do on paper: "sin x", "sin 2x",
// "sin ^2x", "log _2x", "arctan x", and \sin\frac{1}{x} as "sin (1)/(x)".
// math.js needs parentheses around every argument, so add them:
//   sin x        -> sin(x)            sin 2x+cos 3x -> sin(2x)+cos(3x)
//   sin ^2x      -> (sin(x))^2        sin ^-1x      -> asin(x)
//   log _2x      -> log(x, 2)         arctan x      -> atan(x)
//   sin (1)/(x)  -> sin((1)/(x))      sin x^2       -> sin(x^2)
const FUNCTION_PATTERN = /(?<![A-Za-z])(arcsin|arccos|arctan|asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|sec|csc|cot|ln|log|exp)(?![A-Za-z])/g
const RENAME = { arcsin: 'asin', arccos: 'acos', arctan: 'atan' }
const INVERSE = { sin: 'asin', cos: 'acos', tan: 'atan' }

function groupEnd(s, start) { // s[start] === '(' -> index just past its matching ')', or -1
  let depth = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')' && --depth === 0) return i + 1
  }
  return -1
}
function readGroupOrToken(s, i, token) { // "(…)" or a short token like 2, -1, 10
  if (s[i] === '(') { const end = groupEnd(s, i); return end < 0 ? null : { text: s.slice(i + 1, end - 1), end } }
  const m = s.slice(i).match(token)
  return m && m[0] ? { text: m[0], end: i + m[0].length } : null
}
const skipSpaces = (s, i) => { while (s[i] === ' ') i++; return i }

export function functionArguments(input) {
  let s = String(input)
  const starts = [...s.matchAll(FUNCTION_PATTERN)].map(m => [m.index, m[1]]).reverse()
  for (const [start, name] of starts) {
    let i = skipSpaces(s, start + name.length)
    let power = null, base = null
    if (s[i] === '^') { power = readGroupOrToken(s, skipSpaces(s, i + 1), /^-?[0-9.]+/); if (!power) continue; i = skipSpaces(s, power.end) }
    if (s[i] === '_' && name === 'log') { base = readGroupOrToken(s, skipSpaces(s, i + 1), /^[0-9.]+|^e\b/); if (!base) continue; i = skipSpaces(s, base.end) }
    let arg, end
    if (s[i] === '(') {
      end = groupEnd(s, i)
      if (end < 0) continue
      // \sin\frac{1}{x} arrives as "sin (1)/(x)": the whole fraction is the argument.
      if (s.startsWith('/(', end) && groupEnd(s, end + 1) > 0) end = groupEnd(s, end + 1)
      arg = s.slice(i, end)
      if (!power && !base && !RENAME[name] && end === groupEnd(s, i)) continue // already fine: sin(x)
    } else {
      // A nested call already fixed up, as in "sin sin(x)", is the whole argument.
      const call = s.slice(i).match(/^[A-Za-z]+(?=\()/)
      if (call && groupEnd(s, i + call[0].length) > 0) {
        end = groupEnd(s, i + call[0].length)
        arg = s.slice(i, end)
      } else {
        const m = s.slice(i).match(/^[0-9.]*[A-Za-z]*(\^(\([^()]*\)|-?[0-9A-Za-z.]+))?/)
        if (!m || !m[0]) continue
        arg = m[0]
        end = i + arg.length
      }
    }
    const inner = arg.startsWith('(') && groupEnd(arg, 0) === arg.length ? arg.slice(1, -1) : arg
    let fn = RENAME[name] ?? name
    let call
    if (power && power.text.replace(/\s/g, '') === '-1' && INVERSE[fn]) { call = `${INVERSE[fn]}(${inner})`; power = null }
    else if (base) call = `log(${inner}, ${base.text})`
    else call = `${fn}(${inner})`
    if (power) call = `(${call})^(${power.text})`
    // "x^2ln x": multiply explicitly when the function is glued to what comes before it.
    if (start > 0 && /[0-9A-Za-z.)]/.test(s[start - 1])) call = `*${call}`
    s = s.slice(0, start) + call + s.slice(end)
  }
  return s
}
