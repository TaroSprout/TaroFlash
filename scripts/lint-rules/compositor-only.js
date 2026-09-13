/**
 * Oxlint `no-layout-tween` rule: flags a GSAP tween naming a layout property
 * or `filter` instead of transform/opacity. Wired up in vite.config.ts's `lint` block.
 */
import { readFileSync } from 'node:fs'

const FORBIDDEN_KEY =
  /[{,]\s*(width|height|top|left|right|bottom|margin\w*|padding\w*|filter|backdropFilter)\s*:/g

const TWEEN_CALL = /\.(to|from|fromTo)\s*\(/g

// Chains whose root resolves to one of these are treated as a GSAP tween call;
// anything else (`Array.from(...)`, a stray `.to(...)`) is left alone.
const GSAP_ROOTS = new Set(['gsap', 'tl', 'timeline'])

const IDENT_CHAR = /[A-Za-z0-9_$]/

/** The file as it sits on disk, since oxlint hands a Vue SFC's `<script>` block over on its own. */
function readRaw(filename) {
  try {
    return readFileSync(filename, 'utf8')
  } catch {
    return null
  }
}

/** Line and column of a raw-file offset, both 1-based on the line and 0-based on the column. */
function positionOf(raw, offset) {
  const before = raw.slice(0, offset)
  const line = before.split('\n').length
  return { line, column: offset - (before.lastIndexOf('\n') + 1) }
}

/** The index just past a string literal opening at `i`, honouring `\`-escapes. */
function skipStringLiteral(text, i) {
  const quote = text[i]
  let j = i + 1
  while (j < text.length && text[j] !== quote) {
    j += text[j] === '\\' ? 2 : 1
  }
  return j + 1
}

/** One line comment's span, blanked to spaces (its trailing newline kept as-is). */
function skipLineComment(text, i) {
  let j = i
  while (j < text.length && text[j] !== '\n') j++
  return { out: ' '.repeat(j - i), next: j }
}

/** One block comment's span, blanked to spaces (any internal newline kept, for line numbers). */
function skipBlockComment(text, i) {
  let j = i + 2
  while (j < text.length && !(text[j] === '*' && text[j + 1] === '/')) j++
  const end = Math.min(j + 2, text.length)
  const blanked = text.slice(i, end).replace(/[^\n]/g, ' ')
  return { out: blanked, next: end }
}

/**
 * Blanks every comment's characters to a space (keeping newlines, so offsets
 * and line numbers still line up with the original), so a sentence-ending `.`
 * in a comment ahead of a chained `gsap\n  .timeline(...)` call can never read
 * as a property-access dot during the backward chain-root walk.
 */
function stripComments(text) {
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const isQuote = ch === '"' || ch === "'" || ch === '`'
    const isLineComment = ch === '/' && text[i + 1] === '/'
    const isBlockComment = ch === '/' && text[i + 1] === '*'

    if (isQuote) {
      const end = skipStringLiteral(text, i)
      out += text.slice(i, end)
      i = end
      continue
    }
    if (isLineComment) {
      const r = skipLineComment(text, i)
      out += r.out
      i = r.next
      continue
    }
    if (isBlockComment) {
      const r = skipBlockComment(text, i)
      out += r.out
      i = r.next
      continue
    }

    out += ch
    i++
  }
  return out
}

/** The bracket at `closeIdx` matched going backward, or -1 before the start of the string. */
function matchingOpen(text, closeIdx) {
  let depth = 0
  for (let i = closeIdx; i >= 0; i--) {
    const ch = text[i]
    if (ch === ')' || ch === ']' || ch === '}') depth++
    else if (ch === '(' || ch === '[' || ch === '{') depth--
    if (depth === 0 && (ch === '(' || ch === '[' || ch === '{')) return i
  }
  return -1
}

/** The index just before a `)`/`]` at `i`'s matching opener, or null if unmatched. */
function skipClosingBracket(text, i) {
  const open = matchingOpen(text, i)
  return open < 0 ? null : open - 1
}

/** The bracket at `openIdx` matched going forward, or -1 past the end of the string. */
function matchingClose(text, openIdx) {
  let depth = 0
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]
    const isQuote = ch === '"' || ch === "'" || ch === '`'
    if (isQuote) i = skipStringLiteral(text, i) - 1
    if (isQuote) continue

    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    if (depth === 0 && (ch === ')' || ch === ']' || ch === '}')) return i
  }
  return -1
}

/**
 * The dotted identifier chain a `.to(`/`.from(`/`.fromTo(` call hangs off,
 * read backward from the dot so a call chained after `gsap.timeline(...)`
 * resolves the same as a bare `gsap.to(...)` or a `tl.to(...)` on a saved
 * timeline variable.
 */
function chainRoot(text, dotIdx) {
  const segments = []
  let i = dotIdx - 1
  for (;;) {
    while (i >= 0 && /\s/.test(text[i])) i--
    if (i < 0) break

    const closesGroup = text[i] === ')' || text[i] === ']'
    if (closesGroup) i = skipClosingBracket(text, i) ?? -1
    if (closesGroup && i < 0) break
    if (closesGroup) continue

    if (!IDENT_CHAR.test(text[i])) break

    const end = i
    while (i >= 0 && IDENT_CHAR.test(text[i])) i--
    segments.unshift(text.slice(i + 1, end + 1))

    while (i >= 0 && /\s/.test(text[i])) i--
    const chained = i >= 0 && text[i] === '.'
    if (chained) i--
    if (chained) continue
    break
  }
  return segments
}

/** Whether the chain a tween call hangs off plausibly resolves to GSAP. */
function looksLikeGsap(segments) {
  if (segments.length === 0) return false
  if (segments[0] === 'gsap') return true
  if (segments.length === 1) return GSAP_ROOTS.has(segments[0])
  return segments[0] === 'ctx' && segments[1] === 'tl'
}

/** `{ message, loc }` for one offender, either a real position or this repo's Vue-SFC fallback. */
function reportFor(filename, where, key) {
  const message = `Line ${where.line}:${where.column + 1} — GSAP tween animates '${key}', which forces a layout/paint every frame instead of running on the compositor. Only transform-family properties and opacity are allowed here (src/utils/motion/types.ts's MotionVars). Route height/layout motion through the stage primitive (src/components/layout-kit/stage/), or, if it's a tracked pre-existing exception, suppress this one line with an "oxlint-disable-next-line compositor-only/no-layout-tween -- <reason>, follow-on: <ticket>" comment naming the follow-on migration. See .claude/rules/animations.md.`
  // A Vue SFC only parses its <script> block, so put the line in the message and `loc` at the top.
  if (filename.endsWith('.vue')) return { message, loc: { line: 1, column: 0 } }
  return { message, loc: { line: where.line, column: where.column } }
}

const noLayoutTween = {
  meta: {
    docs: {
      description:
        'A GSAP tween animates only transform/opacity, never a layout property or filter, outside the stage primitive.'
    }
  },
  create(context) {
    // The one allowed route for height/layout motion — it owns a tracked budget for the cost.
    if (context.filename.includes('/components/layout-kit/stage/')) return {}

    return {
      Program() {
        const raw = readRaw(context.filename)
        if (raw === null) return
        const code = stripComments(raw)

        for (const call of code.matchAll(TWEEN_CALL)) {
          const dotIdx = call.index
          if (!looksLikeGsap(chainRoot(code, dotIdx))) continue

          const openIdx = dotIdx + call[0].length - 1
          const closeIdx = matchingClose(code, openIdx)
          if (closeIdx < 0) continue

          const args = code.slice(openIdx + 1, closeIdx)
          const offender = FORBIDDEN_KEY.exec(args)
          FORBIDDEN_KEY.lastIndex = 0
          if (!offender) continue

          const where = positionOf(
            raw,
            openIdx + 1 + offender.index + offender[0].indexOf(offender[1])
          )
          context.report(reportFor(context.filename, where, offender[1]))
        }
      }
    }
  }
}

export default {
  meta: { name: 'compositor-only' },
  rules: {
    'no-layout-tween': noLayoutTween
  }
}
