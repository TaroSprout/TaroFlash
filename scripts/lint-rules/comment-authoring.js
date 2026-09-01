/**
 * Oxlint rules for the three mechanical parts of .claude/rules/comment-authoring.md:
 * no comment inside a Vue `<template>`, no multi-line `//` run in a function
 * body, and no `[obligation]` under tests/.
 *
 * Wired up in vite.config.ts's `lint` block; runs on `vp lint` and `vp check`.
 */
import { readFileSync } from 'node:fs'

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

/** A line that declares something the comment above it would be documenting, which is symbol position and takes a JSDoc block instead. */
const DECLARATION =
  /^\s*(export\s+)?(default\s+)?(async\s+)?(function|class|const|let|var|type|interface|enum)\b/

/** The first line carrying code after the given offset, or an empty string past the end of the file. */
function nextCodeLine(text, from) {
  for (const line of text.slice(from).split('\n').slice(1)) {
    if (line.trim() !== '') return line
  }
  return ''
}

/** True when only whitespace sits between the start of the comment's line and the comment itself. */
function ownsItsLine(text, comment) {
  const lineStart = text.lastIndexOf('\n', comment.range[0] - 1) + 1
  return text.slice(lineStart, comment.range[0]).trim() === ''
}

/** The SFC's own opening template tag, at the start of a line rather than a nested slot's indented one. */
const TEMPLATE_OPEN = /^<template[^>]*>/m

/** Every closing template tag sitting at the start of a line. */
const TEMPLATE_CLOSE = /^<\/template>/gm

/** The span of the SFC's own `<template>` block, taking the outermost tags so a nested slot template doesn't end it early. */
function templateSpan(raw) {
  const open = TEMPLATE_OPEN.exec(raw)
  if (!open) return null
  let end = -1
  for (const close of raw.matchAll(TEMPLATE_CLOSE)) end = close.index
  return end > open.index ? { from: open.index + open[0].length, to: end } : null
}

const noTemplateComment = {
  meta: {
    docs: { description: 'A Vue `<template>` carries no comments.' }
  },
  create(context) {
    if (!context.filename.endsWith('.vue')) return {}
    return {
      Program() {
        const raw = readRaw(context.filename)
        if (raw === null) return
        const span = templateSpan(raw)
        if (!span) return
        for (const match of raw.matchAll(/<!--/g)) {
          // Every HTML comment opener in the file; the ones outside the template block belong to the styles or the top of the file.
          if (match.index < span.from || match.index >= span.to) continue
          const where = positionOf(raw, match.index)
          // Oxlint only parses the `<script>` block of an SFC, so a location outside it is out of range: the line goes in the message and the marker sits at the top of the script.
          context.report({
            message: `Comment inside <template>, at line ${where.line}:${where.column + 1}. Delete it — say it in the component, slot or data-testid name instead. See .claude/rules/comment-authoring.md.`,
            loc: { line: 1, column: 0 }
          })
        }
      }
    }
  }
}

const singleLineBodyComment = {
  meta: {
    docs: { description: 'A comment inside a function body is one `//` line.' }
  },
  create(context) {
    const bodies = []
    const collect = (node) => {
      if (node.body && node.body.type === 'BlockStatement') bodies.push(node.body.range)
    }
    return {
      FunctionDeclaration: collect,
      FunctionExpression: collect,
      ArrowFunctionExpression: collect,
      'Program:exit'() {
        const source = context.sourceCode
        const comments = source
          .getAllComments()
          .filter((c) => c.type === 'Line' && ownsItsLine(source.text, c))
        let run = []
        const flush = () => {
          if (run.length < 2) return
          const start = run[0].range[0]
          const end = run[run.length - 1].range[1]
          const inBody = bodies.some(([from, to]) => from <= start && end <= to)
          if (inBody && !DECLARATION.test(nextCodeLine(source.text, end))) {
            context.report({
              message: `${run.length} consecutive // lines inside a function body, where the shape is one. Cut it to a single line, and put the depth in a knowledge entry cited with →[K:<slug>]. See .claude/rules/comment-authoring.md.`,
              loc: run[0].loc
            })
          }
          run = []
        }
        for (const comment of comments) {
          const previous = run[run.length - 1]
          if (previous && comment.loc.start.line === previous.loc.end.line + 1) run.push(comment)
          else {
            flush()
            run = [comment]
          }
        }
        flush()
      }
    }
  }
}

const noObligationVocabulary = {
  meta: {
    docs: { description: 'The word `[obligation]` belongs to no test name.' }
  },
  create(context) {
    return {
      Program() {
        const source = context.sourceCode
        for (const match of source.text.matchAll(/\[obligation\]/g)) {
          // The bracketed word itself, wherever it sits — a test title, a string, a comment.
          const before = source.text.slice(0, match.index)
          context.report({
            message:
              'The literal [obligation] is internal skill vocabulary, not test vocabulary. Name what the code must do instead.',
            loc: {
              line: before.split('\n').length,
              column: match.index - (before.lastIndexOf('\n') + 1)
            }
          })
        }
      }
    }
  }
}

export default {
  meta: { name: 'comment-authoring' },
  rules: {
    'no-template-comment': noTemplateComment,
    'single-line-body-comment': singleLineBodyComment,
    'no-obligation-vocabulary': noObligationVocabulary
  }
}
