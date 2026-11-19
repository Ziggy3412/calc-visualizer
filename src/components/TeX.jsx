import katex from 'katex'

// Renders a LaTeX string as formatted math.
// displayMode=true for centered block equations, false for inline.
export default function TeX({ math: tex, display = false }) {
  let html
  try {
    html = katex.renderToString(tex.replace(/\\exponentialE/g, 'e'), {
      displayMode: display,
      throwOnError: false,  // show red error text instead of crashing
    })
  } catch {
    html = tex // fallback: show raw string
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
