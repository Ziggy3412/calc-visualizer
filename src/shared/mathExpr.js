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
export function normalizeMathAscii(input) {
  return String(input).replace(/θ/g, 'theta').replace(/\bln\b/g, 'log').replace(/\)\s*(?=[A-Za-z0-9_(])/g, ')*')
}
export function normalizeExpr(input) {
  const s = stripLHS(input)
  return s ? normalizeMathAscii(s) : s
}
