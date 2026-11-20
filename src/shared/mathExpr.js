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
export function normalizeMathAscii(input) {
  return absoluteBars(String(input)).replace(/θ/g, 'theta').replace(/\bln\b/g, 'log').replace(/\)\s*(?=[A-Za-z0-9_(])/g, ')*')
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
