import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { checkMigration } from '../../../scripts/migration-knowledge-gate.mjs'

// Every test builds its own throwaway root under os.tmpdir() — never assert
// against the real repo's migrations or knowledge files.

const createdRoots = []

afterEach(() => {
  while (createdRoots.length) {
    const root = createdRoots.pop()
    rmSync(root, { recursive: true, force: true })
  }
})

/** Builds a temp fixture root with the given files, returns its path. */
function makeRoot(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'migration-gate-'))
  createdRoots.push(root)

  for (const [relPath, content] of Object.entries(files)) {
    const absolute = join(root, relPath)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content)
  }

  return root
}

const MIGRATION_PATH = 'supabase/migrations/00001_add_decks.sql'

describe('checkMigration — header covers every parsed object', () => {
  test('a header naming all objects and a real knowledge file passes clean', () => {
    const root = makeRoot({
      [MIGRATION_PATH]:
        'create table decks (id bigint);\n' + '-- knowledge: decks — corpus/decks/decks.md\n',
      'corpus/decks/decks.md': '# Decks\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, ['corpus/decks/decks.md'])

    expect(errors).toEqual([])
  })

  test('the unanswered count is reported, but never the names', () => {
    const root = makeRoot({
      [MIGRATION_PATH]:
        'create table decks (id bigint);\n' +
        'create table cards (id bigint);\n' +
        '-- knowledge: decks — corpus/decks/decks.md\n',
      'corpus/decks/decks.md': '# Decks\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, ['corpus/decks/decks.md'])

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/answers for 1 of the 2 schema objects/)
    expect(errors[0]).not.toMatch(/\bcards\b/)
  })
})

describe('checkMigration — unrecorded verdict', () => {
  test('unrecorded is accepted when no knowledge file mentions the object', () => {
    const root = makeRoot({
      [MIGRATION_PATH]:
        'create table purge_downgraded_decks (id bigint);\n' +
        '-- knowledge: purge_downgraded_decks — unrecorded\n',
      'corpus/decks/decks.md': '# Decks\nNothing about that table here.\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, ['corpus/decks/decks.md'])

    expect(errors).toEqual([])
  })

  test('unrecorded is rejected when a knowledge file already mentions the object, word-boundary and case-insensitive', () => {
    const root = makeRoot({
      [MIGRATION_PATH]: 'create table media (id bigint);\n' + '-- knowledge: media — unrecorded\n',
      'corpus/decks/decks.md': '# Decks\nThe MEDIA table stores card attachments.\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, ['corpus/decks/decks.md'])

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/unrecorded/)
    expect(errors[0]).toContain('corpus/decks/decks.md')
  })

  test('a word-boundary match does not fire on a substring mention', () => {
    const root = makeRoot({
      [MIGRATION_PATH]: 'create table card (id bigint);\n' + '-- knowledge: card — unrecorded\n',
      'corpus/decks/decks.md': '# Decks\nThe cards table has many rows.\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, ['corpus/decks/decks.md'])

    expect(errors).toEqual([])
  })

  test('a corpus/ file is preferred over a .claude/ file when both mention the object', () => {
    const root = makeRoot({
      [MIGRATION_PATH]: 'create table media (id bigint);\n' + '-- knowledge: media — unrecorded\n',
      '.claude/rules/notes.md': 'A stray note mentioning the media table.\n',
      'corpus/decks/decks.md': 'The media table stores card attachments.\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, [
      '.claude/rules/notes.md',
      'corpus/decks/decks.md'
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('corpus/decks/decks.md')
    expect(errors[0]).not.toContain('.claude/rules/notes.md')
  })
})

describe('checkMigration — no schema objects', () => {
  test('a migration touching no schema object passes with the literal marker', () => {
    const root = makeRoot({
      [MIGRATION_PATH]:
        'grant select on all tables in schema public to authenticated;\n' +
        '-- knowledge: no schema objects\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, [])

    expect(errors).toEqual([])
  })

  test('a migration touching no schema object with no header at all fails', () => {
    const root = makeRoot({
      [MIGRATION_PATH]: 'grant select on all tables in schema public to authenticated;\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, [])

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/no schema objects/)
  })
})

describe('checkMigration — unknown claims', () => {
  test('an object claimed but not touched is reported as unknown and excluded from other checks', () => {
    const root = makeRoot({
      [MIGRATION_PATH]:
        'create table decks (id bigint);\n' +
        '-- knowledge: decks — corpus/decks/decks.md\n' +
        '-- knowledge: cards — corpus/decks/decks.md\n',
      'corpus/decks/decks.md': '# Decks\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, ['corpus/decks/decks.md'])

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/`cards` is not a schema object this migration touches/)
  })
})

describe('checkMigration — malformed header and missing knowledge file', () => {
  test('a header line with no em-dash separator is malformed', () => {
    const root = makeRoot({
      [MIGRATION_PATH]: 'create table decks (id bigint);\n' + '-- knowledge: decks\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, [])

    expect(errors).toEqual(
      expect.arrayContaining([expect.stringContaining('needs `<objects> — <knowledge file>`')])
    )
  })

  test('a header naming a knowledge file that does not exist in the repo fails', () => {
    const root = makeRoot({
      [MIGRATION_PATH]:
        'create table decks (id bigint);\n' + '-- knowledge: decks — corpus/nope.md\n'
    })

    const errors = checkMigration(root, MIGRATION_PATH, ['corpus/decks/decks.md'])

    expect(errors).toEqual([
      expect.stringContaining('`corpus/nope.md` is not a knowledge file in this repo')
    ])
  })
})
