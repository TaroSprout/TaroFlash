#!/usr/bin/env node
// PreToolUse hook body: reads the tool-call JSON from stdin, checked against comment-authoring's
// tests/** collapse rule. →[K:tests-comment-collapse]

let raw = ''
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    process.exit(0)
  }
  run(input)
})

function run(input) {
  const toolInput = input.tool_input || {}
  const filePath = toolInput.file_path || ''
  if (!inScope(filePath)) process.exit(0)

  for (const snippet of collectSnippets(input.tool_name, toolInput)) {
    const violation = findViolation(snippet)
    if (violation) {
      console.error(
        `${violation} in ${filePath} — tests/** comments collapse to one shape: a short, single ` +
          `trailing // line (comment-authoring.md → K:tests-comment-collapse). Rewrite it that way, ` +
          `or delete it.`
      )
      process.exit(2)
    }
  }
  process.exit(0)
}

function inScope(filePath) {
  return /(^|\/)tests\//.test(filePath) || /supabase\/functions\/.*\.test\.ts$/.test(filePath)
}

function collectSnippets(toolName, toolInput) {
  if (toolName === 'Write') return [toolInput.content || '']
  if (toolName === 'Edit') return [toolInput.new_string || '']
  if (toolName === 'MultiEdit') return (toolInput.edits || []).map((edit) => edit.new_string || '')
  return []
}

function findViolation(text) {
  if (/\/\*\*[\s\S]*?\*\//.test(text)) return 'JSDoc /** */ block'
  if (/^[ \t]*\/\/[ \t]*[-─_=]{3,}/m.test(text)) return 'section-banner comment'
  let run = 0
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//')) {
      run += 1
      if (run >= 2) return 'multi-line above-line // comment block'
    } else {
      run = 0
    }
  }
  return null
}
