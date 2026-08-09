/**
 * The schema objects a migration touches, as bare lowercase names.
 *
 * Comments and function bodies are stripped first: prose about a table, and SQL
 * that only reads one at runtime, are not schema changes.
 */
const DOLLAR_QUOTED = /\$([\w]*)\$[\s\S]*?\$\1\$/g
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT = /--[^\n]*/g

const NAME = '((?:"[^"]+"|[\\w]+)(?:\\.(?:"[^"]+"|[\\w]+))?)'
const PATTERNS = [
  new RegExp(
    `\\b(?:create|alter|drop)\\s+(?:unlogged\\s+)?table\\s+(?:if\\s+(?:not\\s+)?exists\\s+|only\\s+)?${NAME}`,
    'gi'
  ),
  new RegExp(
    `\\b(?:create|alter|drop)\\s+(?:or\\s+replace\\s+)?(?:materialized\\s+)?view\\s+(?:if\\s+(?:not\\s+)?exists\\s+)?${NAME}`,
    'gi'
  ),
  new RegExp(
    `\\b(?:create|alter|drop)\\s+(?:or\\s+replace\\s+)?function\\s+(?:if\\s+exists\\s+)?${NAME}`,
    'gi'
  ),
  new RegExp(`\\b(?:create|alter|drop)\\s+type\\s+(?:if\\s+(?:not\\s+)?exists\\s+)?${NAME}`, 'gi'),
  new RegExp(
    `\\b(?:create|drop)\\s+(?:unique\\s+)?index\\s+(?:concurrently\\s+)?(?:if\\s+(?:not\\s+)?exists\\s+)?(?:[\\w"]+\\s+)?on\\s+${NAME}`,
    'gi'
  ),
  new RegExp(`\\b(?:create|alter|drop)\\s+policy\\s+(?:[^\\s]+\\s+)+?on\\s+${NAME}`, 'gi'),
  new RegExp(
    `\\b(?:create|drop)\\s+(?:or\\s+replace\\s+)?trigger\\s+[\\w"]+\\s+(?:[\\s\\S]*?)\\bon\\s+${NAME}`,
    'gi'
  )
]

/** Strips the schema qualifier and quoting — `"public"."decks"` and `decks` are one object. */
function bareName(raw) {
  const parts = raw.split('.').map((part) => part.replace(/"/g, '').toLowerCase())
  return parts.at(-1)
}

export function migrationObjects(sql) {
  const executable = sql
    .replace(DOLLAR_QUOTED, ' ')
    .replace(BLOCK_COMMENT, ' ')
    .replace(LINE_COMMENT, ' ')

  const found = new Set()
  for (const pattern of PATTERNS) {
    for (const match of executable.matchAll(pattern)) found.add(bareName(match[1]))
  }

  return [...found].sort((a, b) => a.localeCompare(b))
}
