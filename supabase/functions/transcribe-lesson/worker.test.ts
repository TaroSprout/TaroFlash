// Tests for the phase state machine in worker.ts — the orchestration the DB
// chain drives one step at a time. The per-step cores (Whisper, translate,
// transliterate) have their own tests; here we use phases whose work short-
// circuits without a network call (empty sentences, or a download that fails)
// where possible, and a stubbed fetch where a phase genuinely needs a
// populated response to prove its write lands on the right column.

import { assertEquals } from '@std/assert'
import { processLessonPhase } from './worker.ts'

type LoadResult = { data: unknown; error: unknown }
type SentenceRow = Record<string, unknown> & { ordinal: number }

// Minimal fake of the supabase-js client surface worker.ts touches:
//   from('lessons').select(...).eq(...).single()          -> loadLesson
//   from('lessons').update(patch).eq(...)                 -> update / settleFailed
//   from('lesson_sentences').select(...).eq(...).order()  -> loadSentences
//   rpc(name, args)                                        -> upsert/set_lesson_*
//   storage.from(bucket).download(path)                   -> downloadAudio
// Records every update patch and rpc call, and lets a test force a write to error.
// `sentences` is a shared mutable store so a replayed phase call sees whatever
// the previous call upserted — the shape idempotency needs to prove itself against.
function makeAdmin(opts: {
  load: LoadResult
  download?: { data: unknown; error: unknown }
  sentences?: SentenceRow[]
  failUpdate?: (patch: Record<string, unknown>) => boolean
  failRpc?: (name: string) => boolean
}) {
  const updates: Record<string, unknown>[] = []
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = []
  const sentences: SentenceRow[] = opts.sentences ?? []

  // deno-lint-ignore no-explicit-any
  const admin: any = {
    from(table: string) {
      if (table === 'lesson_sentences') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [...sentences].sort((a, b) => a.ordinal - b.ordinal),
                  error: null
                })
            })
          })
        }
      }
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(opts.load) }) }),
        update: (patch: Record<string, unknown>) => ({
          eq: () => {
            updates.push(patch)
            return Promise.resolve({ error: opts.failUpdate?.(patch) ? { message: 'boom' } : null })
          }
        })
      }
    },
    rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args })
      if (opts.failRpc?.(name)) return Promise.resolve({ error: { message: 'rpc boom' } })

      if (name === 'upsert_lesson_sentences') {
        const rows = args.p_sentences as SentenceRow[]
        for (const row of rows) {
          const i = sentences.findIndex((s) => s.ordinal === row.ordinal)
          if (i >= 0) sentences[i] = { ...sentences[i], ...row }
          else sentences.push({ ...row })
        }
      }
      if (name === 'set_lesson_chapters') {
        const marks = args.p_chapters as { ordinal: number; title: string }[]
        for (const mark of marks) {
          const row = sentences.find((s) => s.ordinal === mark.ordinal)
          if (row) row.chapter_title = mark.title
        }
      }
      if (name === 'set_lesson_translations') {
        const patch = args.p_translations as { ordinal: number; translation: string }[]
        for (const p of patch) {
          const row = sentences.find((s) => s.ordinal === p.ordinal)
          if (row) row.translation = p.translation
        }
      }
      if (name === 'set_lesson_readings') {
        const patch = args.p_readings as { ordinal: number; readings: (string | null)[] }[]
        for (const p of patch) {
          const row = sentences.find((s) => s.ordinal === p.ordinal)
          if (row) row.readings = p.readings
        }
      }

      return Promise.resolve({ error: null })
    },
    storage: {
      from: () => ({
        download: () => Promise.resolve(opts.download ?? { data: null, error: { message: 'gone' } })
      })
    }
  }
  return { admin, updates, rpcCalls, sentences }
}

const row = (over: Record<string, unknown>) => ({
  data: {
    id: 1,
    status: 'processing',
    phase: null,
    audio_path: 'm/a.mp3',
    script: 'original',
    lang: null,
    chunks: null,
    chunk_cursor: null,
    ...over
  },
  error: null
})

// Swap globalThis.fetch for a queue of responses, returning a restore fn.
function stubFetch(make: () => Response) {
  const original = globalThis.fetch
  globalThis.fetch = () => Promise.resolve(make())
  return () => {
    globalThis.fetch = original
  }
}

const whisperResponse = (segments: { start: number; end: number; text: string }[]) =>
  new Response(
    JSON.stringify({
      text: segments.map((s) => s.text).join(''),
      language: 'en',
      segments,
      words: segments.map((s) => ({ word: s.text, start: s.start, end: s.end }))
    }),
    { status: 200 }
  )

const anthropicOk = (body: Record<string, unknown>) =>
  new Response(
    JSON.stringify({ content: [{ text: JSON.stringify(body) }], stop_reason: 'end_turn' }),
    { status: 200 }
  )

Deno.test('skips a row that is no longer processing (idempotent re-delivery)', async () => {
  const { admin, updates } = makeAdmin({ load: row({ status: 'ready', phase: null }) })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 0)
})

Deno.test('skips when the row is missing', async () => {
  const { admin, updates } = makeAdmin({ load: { data: null, error: { message: 'no row' } } })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 0)
})

Deno.test('transcribe phase: a failed audio download settles failed/audio_unavailable', async () => {
  const { admin, updates } = makeAdmin({
    load: row({ phase: 'transcribing' }),
    download: { data: null, error: { message: 'gone' } }
  })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 1)
  assertEquals(updates[0].status, 'failed')
  assertEquals(updates[0].error_code, 'audio_unavailable')
  assertEquals(updates[0].phase, null)
})

Deno.test('transcribe phase: a replayed chunk upserts by ordinal — no duplicate rows', async () => {
  const audioFile = new File(['audio'], 'a.mp3')
  const restore = stubFetch(() =>
    whisperResponse([
      { start: 0, end: 1, text: 'hi ' },
      { start: 1, end: 2, text: 'there' }
    ])
  )
  try {
    const { admin, sentences, rpcCalls } = makeAdmin({
      load: row({
        phase: 'transcribing',
        chunks: [{ path: 'm/a.mp3', offset: 0 }],
        chunk_cursor: 0
      }),
      download: { data: audioFile, error: null }
    })

    // First delivery: no sentences stored yet, so both segments land as new rows.
    await processLessonPhase(admin, 1)
    assertEquals(sentences.length, 2)
    assertEquals(
      sentences.map((s) => s.ordinal),
      [0, 1]
    )

    // A duplicate delivery of the SAME cursor (the lessons-row update hasn't been
    // observed yet by the caller) re-transcribes the identical chunk. The stored
    // rows already cover every segment up to the boundary, so this must overwrite
    // in place rather than mint new ordinals.
    const upsertCallsBefore = rpcCalls.filter((c) => c.name === 'upsert_lesson_sentences').length
    await processLessonPhase(admin, 1)
    assertEquals(sentences.length, 2)
    assertEquals(
      sentences.map((s) => s.ordinal),
      [0, 1]
    )
    // The replay's stitch drops everything at/before the stored boundary, so no
    // second upsert call fires — never mind a duplicate-inserting one.
    assertEquals(
      rpcCalls.filter((c) => c.name === 'upsert_lesson_sentences').length,
      upsertCallsBefore
    )
  } finally {
    restore()
  }
})

Deno.test('chapter phase: writes only the chapter column, with ordinals mapped from the stored rows', async () => {
  const restore = stubFetch(() =>
    anthropicOk({
      chapters: [
        { title: 'One', start_index: 0 },
        { title: 'Two', start_index: 2 }
      ]
    })
  )
  try {
    const { admin, updates, rpcCalls, sentences } = makeAdmin({
      load: row({ phase: 'chaptering' }),
      sentences: [
        { ordinal: 5, start_seconds: 100, end_seconds: 108, text: 'A', words: [] },
        { ordinal: 6, start_seconds: 110, end_seconds: 118, text: 'B', words: [] },
        { ordinal: 7, start_seconds: 120, end_seconds: 128, text: 'C', words: [] }
      ]
    })
    await processLessonPhase(admin, 1)

    // Chapter marks reference the sentence rows' own ordinals (5, 7) — not the
    // 0-based index detectChapters worked from internally.
    const chapterCall = rpcCalls.find((c) => c.name === 'set_lesson_chapters')
    assertEquals(chapterCall?.args.p_chapters, [
      { ordinal: 5, title: 'One' },
      { ordinal: 7, title: 'Two' }
    ])
    assertEquals(sentences.find((s) => s.ordinal === 5)?.chapter_title, 'One')
    assertEquals(sentences.find((s) => s.ordinal === 7)?.chapter_title, 'Two')

    // No other phase's column was touched by this write.
    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_translations'),
      false
    )
    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_readings'),
      false
    )
    assertEquals(sentences.find((s) => s.ordinal === 5)?.translation, undefined)
    assertEquals(sentences.find((s) => s.ordinal === 5)?.readings, undefined)

    assertEquals(updates.length, 1)
    assertEquals(updates[0].phase, 'paragraphing')
    assertEquals(updates[0].chunk_cursor, 0)
  } finally {
    restore()
  }
})

Deno.test('paragraph phase: empty sentences advance straight to translating', async () => {
  const { admin, updates } = makeAdmin({ load: row({ phase: 'paragraphing' }) })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 1)
  assertEquals(updates[0].phase, 'translating')
  assertEquals(updates[0].chunk_cursor, 0)
})

Deno.test('paragraph phase: writes only the strengths the model scored, cursor advances to done', async () => {
  const restore = stubFetch(() => anthropicOk({ strengths: [0.1, 'unscored', 0.8] }))
  try {
    const { admin, updates, rpcCalls, sentences } = makeAdmin({
      load: row({ phase: 'paragraphing', chunk_cursor: 0 }),
      sentences: [
        { ordinal: 0, text: 'A', words: [] },
        { ordinal: 1, text: 'B', words: [] },
        { ordinal: 2, text: 'C', words: [] }
      ]
    })
    await processLessonPhase(admin, 1)

    // The null-strength middle entry is filtered out of the RPC patch — its
    // break_strength is left untouched rather than written as null.
    const strengthsCall = rpcCalls.find((c) => c.name === 'set_lesson_break_strengths')
    assertEquals(strengthsCall?.args.p_strengths, [
      { ordinal: 0, strength: 0.1 },
      { ordinal: 2, strength: 0.8 }
    ])
    const patch = strengthsCall?.args.p_strengths as { ordinal: number }[] | undefined
    assertEquals(
      patch?.some((p) => p.ordinal === 1),
      false
    )

    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_translations'),
      false
    )
    assertEquals(sentences.find((s) => s.ordinal === 0)?.translation, undefined)

    // All 3 sentences fit in one slice (well under PARAGRAPH_SEG_BATCH), so the
    // cursor is done and the phase advances.
    assertEquals(updates.length, 1)
    assertEquals(updates[0].phase, 'translating')
    assertEquals(updates[0].chunk_cursor, 0)
  } finally {
    restore()
  }
})

Deno.test('paragraph phase: a slice not yet covering every sentence advances the cursor, not the phase', async () => {
  const restore = stubFetch(() => anthropicOk({ strengths: Array(40).fill(0.5) }))
  try {
    const sentences = Array.from({ length: 121 }, (_, i) => ({
      ordinal: i,
      text: `s${i}`,
      words: []
    }))
    const { admin, updates } = makeAdmin({
      load: row({ phase: 'paragraphing', chunk_cursor: 0 }),
      sentences
    })
    await processLessonPhase(admin, 1)

    // Cursor 0 over 121 sentences only reaches PARAGRAPH_SEG_BATCH (120), one
    // sentence short of the end — the cursor advances but the phase does not.
    assertEquals(updates.length, 1)
    assertEquals(updates[0].chunk_cursor, 120)
    assertEquals(updates[0].phase, undefined)
  } finally {
    restore()
  }
})

Deno.test('paragraph phase: a failed detection still advances the cursor, never fails the lesson', async () => {
  const restore = stubFetch(() => new Response('upstream boom', { status: 500 }))
  try {
    const { admin, updates, rpcCalls } = makeAdmin({
      load: row({ phase: 'paragraphing', chunk_cursor: 0 }),
      sentences: [
        { ordinal: 0, text: 'A', words: [] },
        { ordinal: 1, text: 'B', words: [] }
      ]
    })
    await processLessonPhase(admin, 1)

    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_break_strengths'),
      false
    )
    assertEquals(updates.length, 1)
    assertEquals(updates[0].status, undefined)
    assertEquals(updates[0].phase, 'translating')
  } finally {
    restore()
  }
})

Deno.test('translate phase: empty segments advance to transliterating', async () => {
  const { admin, updates } = makeAdmin({ load: row({ phase: 'translating' }) })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 1)
  assertEquals(updates[0].phase, 'transliterating')
})

Deno.test('translate phase: writes only the translation column', async () => {
  const restore = stubFetch(() => anthropicOk({ translations: ['Bonjour', 'Monde'] }))
  try {
    const { admin, updates, rpcCalls, sentences } = makeAdmin({
      load: row({ phase: 'translating', chunk_cursor: 0 }),
      sentences: [
        { ordinal: 0, text: 'Hello', words: [] },
        { ordinal: 1, text: 'World', words: [] }
      ]
    })
    await processLessonPhase(admin, 1)

    const translateCall = rpcCalls.find((c) => c.name === 'set_lesson_translations')
    assertEquals(translateCall?.args.p_translations, [
      { ordinal: 0, translation: 'Bonjour' },
      { ordinal: 1, translation: 'Monde' }
    ])
    assertEquals(sentences.find((s) => s.ordinal === 0)?.translation, 'Bonjour')

    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_chapters'),
      false
    )
    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_readings'),
      false
    )

    assertEquals(updates.length, 1)
    assertEquals(updates[0].phase, 'transliterating')
  } finally {
    restore()
  }
})

Deno.test('transliterate phase: empty words settle the row to ready', async () => {
  const { admin, updates } = makeAdmin({ load: row({ phase: 'transliterating' }) })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 1)
  assertEquals(updates[0].status, 'ready')
  assertEquals(updates[0].phase, null)
  assertEquals(updates[0].error_code, null)
})

Deno.test('transliterate phase: writes only the readings column', async () => {
  const restore = stubFetch(() => anthropicOk({ readings: ['に', 'ほん'] }))
  try {
    const { admin, updates, rpcCalls, sentences } = makeAdmin({
      load: row({ phase: 'transliterating', chunk_cursor: 0, lang: 'ja' }),
      sentences: [
        {
          ordinal: 0,
          text: '日本',
          words: [{ word: '日' }, { word: '本' }]
        }
      ]
    })
    await processLessonPhase(admin, 1)

    const readingsCall = rpcCalls.find((c) => c.name === 'set_lesson_readings')
    assertEquals(readingsCall?.args.p_readings, [{ ordinal: 0, readings: ['に', 'ほん'] }])
    assertEquals(sentences.find((s) => s.ordinal === 0)?.readings, ['に', 'ほん'])

    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_chapters'),
      false
    )
    assertEquals(
      rpcCalls.some((c) => c.name === 'set_lesson_translations'),
      false
    )

    assertEquals(updates.length, 1)
    assertEquals(updates[0].status, 'ready')
  } finally {
    restore()
  }
})

Deno.test('every write stamps updated_at (the reaper heartbeat)', async () => {
  const { admin, updates } = makeAdmin({ load: row({ phase: 'transliterating' }) })
  await processLessonPhase(admin, 1)
  assertEquals(typeof updates[0].updated_at, 'string')
})

Deno.test('a failed phase write is not swallowed — it settles the row failed', async () => {
  // Fail only the success write (status: 'ready'); the recovery write succeeds.
  const { admin, updates } = makeAdmin({
    load: row({ phase: 'transliterating' }),
    failUpdate: (patch) => patch.status === 'ready'
  })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 2)
  assertEquals(updates[0].status, 'ready') // attempted, threw
  assertEquals(updates[1].status, 'failed') // settleFailed caught it
  assertEquals(updates[1].error_code, 'unknown')
})
