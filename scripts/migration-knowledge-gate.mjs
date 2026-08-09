#!/usr/bin/env node
/**
 * Blocks a migration that leaves recorded knowledge behind.
 *
 * Every schema object a new migration touches is answered in that migration's
 * own header — the knowledge file the change was checked against, or
 * `unrecorded` where nothing covers it yet.
 *
 *   node scripts/migration-knowledge-gate.mjs --base origin/master
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listFiles, matchesAny, readConfig } from './knowledge/scan.mjs'
import { migrationObjects } from './knowledge/migration-objects.mjs'

const MIGRATIONS = 'supabase/migrations/'
const HEADER = /^\s*--\s*knowledge:\s*(.+?)\s*$/gm
const NO_OBJECTS = 'no schema objects'
const UNRECORDED = 'unrecorded'

const RULE =
  'This migration changes schema objects the knowledge layer may describe. Name them in a ' +
  '`-- knowledge:` header with the file you checked against, or `unrecorded` if nothing ' +
  'covers them. →[K:knowledge-migration-gate]'

function parseArgs(argv) {
  const args = { base: 'origin/master', root: process.cwd() }

  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--base') args.base = argv[i + 1]
    if (argv[i] === '--root') args.root = argv[i + 1]
  }

  return args
}

function addedMigrations(root, base) {
  let diff
  try {
    diff = execFileSync('git', ['diff', '--name-status', '--diff-filter=A', `${base}...HEAD`], {
      cwd: root,
      encoding: 'utf8'
    })
  } catch {
    // Usually a shallow clone that doesn't contain the base commit — a passing
    // gate there would be a false negative, so say which ref is missing.
    throw new Error(
      `cannot diff against ${base} — it is not in this checkout. A CI job running this gate needs fetch-depth: 0.`
    )
  }

  return diff
    .split('\n')
    .map((line) => line.split('\t').at(-1)?.trim())
    .filter((path) => path?.startsWith(MIGRATIONS) && path.endsWith('.sql'))
}

/** `<names> — <verdict>` per header line; a line the format doesn't fit is reported, not guessed. */
function parseHeader(text) {
  const claims = []
  const malformed = []
  let declaresNoObjects = false

  for (const [, body] of text.matchAll(HEADER)) {
    if (body === NO_OBJECTS) {
      declaresNoObjects = true
      continue
    }

    const [names, verdict, ...rest] = body.split('—').map((part) => part.trim())
    if (!names || !verdict || rest.length) {
      malformed.push(body)
      continue
    }

    for (const name of names
      .split(',')
      .map((one) => one.trim().toLowerCase())
      .filter(Boolean)) {
      claims.push({ name, verdict })
    }
  }

  return { claims, malformed, declaresNoObjects }
}

/** The knowledge file whose prose already talks about this object, if any. Domain topics answer before rules and notes do. */
function mentionedIn(root, knowledgeFiles, name) {
  const word = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  const ranked = [...knowledgeFiles].sort(
    (a, b) => Number(b.startsWith('corpus/')) - Number(a.startsWith('corpus/'))
  )

  return ranked.find((path) => word.test(readFileSync(join(root, path), 'utf8')))
}

export function checkMigration(root, path, knowledgeFiles) {
  const errors = []
  const at = basename(path)
  const text = readFileSync(join(root, path), 'utf8')
  const objects = migrationObjects(text)
  const { claims, malformed, declaresNoObjects } = parseHeader(text)

  for (const line of malformed) {
    errors.push(`${at} — \`-- knowledge: ${line}\` needs \`<objects> — <knowledge file>\``)
  }

  if (!objects.length) {
    if (!declaresNoObjects && !claims.length) {
      errors.push(
        `${at} — no header; a migration changing no schema object says \`-- knowledge: ${NO_OBJECTS}\``
      )
    }
    return errors
  }

  const claimed = new Set(claims.map((claim) => claim.name))
  const unknown = [...claimed].filter((name) => !objects.includes(name))
  const missing = objects.filter((name) => !claimed.has(name)).length

  for (const name of unknown) {
    errors.push(`${at} — \`${name}\` is not a schema object this migration touches`)
  }
  // The missing names stay unprinted on purpose: the answer is in the migration
  // the author just wrote, and a gate that dictates its own answer is a gate
  // that gets pasted rather than read.
  if (missing) {
    errors.push(
      `${at} — answers for ${objects.length - missing} of the ${objects.length} schema objects it touches; read the migration and name the rest`
    )
  }

  for (const claim of claims.filter((one) => !unknown.includes(one.name))) {
    if (claim.verdict === UNRECORDED) {
      const mention = mentionedIn(root, knowledgeFiles, claim.name)
      if (mention) {
        errors.push(
          `${at} — \`${claim.name}\` is called ${UNRECORDED}, but ${mention} describes it; cite that file and amend it where this change makes it false`
        )
      }
      continue
    }
    if (!knowledgeFiles.includes(claim.verdict)) {
      errors.push(`${at} — \`${claim.verdict}\` is not a knowledge file in this repo`)
    }
  }

  return errors
}

export function gateMigrations(root, base) {
  const config = readConfig(root)
  const knowledgeFiles = listFiles(root).filter((path) => matchesAny(path, config.slugs.declare_in))
  const migrations = addedMigrations(root, base).filter((path) => existsSync(join(root, path)))

  return {
    migrations,
    errors: migrations.flatMap((path) => checkMigration(root, path, knowledgeFiles))
  }
}

function main() {
  const { root, base } = parseArgs(process.argv.slice(2))
  const { migrations, errors } = gateMigrations(root, base)

  for (const error of errors) console.error(`::error::${error}`)
  if (errors.length) console.error(`::error::${RULE}`)

  console.log(
    `migration-knowledge-gate: ${migrations.length} added migrations, ${errors.length} unanswered`
  )
  if (errors.length) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
