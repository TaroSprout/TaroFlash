// Tests for the phase state machine in worker.ts — the orchestration the DB
// chain drives one step at a time. The per-step cores (Whisper, translate,
// transliterate) have their own tests; here we use phases whose work short-
// circuits without a network call (empty segments/words, or a download that
// fails) so we can assert dispatch, idempotency, terminal settling, and that a
// failed write surfaces as a 'failed' row rather than being swallowed.

import { assertEquals } from '@std/assert'
import { processLessonPhase } from './worker.ts'

type LoadResult = { data: unknown; error: unknown }

// Minimal fake of the supabase-js client surface worker.ts touches:
//   from('lessons').select(...).eq(...).single()  -> loadLesson
//   from('lessons').update(patch).eq(...)          -> update / settleFailed
//   storage.from(bucket).download(path)            -> downloadAudio
// Records every update patch, and lets a test force a write to error.
function makeAdmin(opts: {
  load: LoadResult
  download?: { data: unknown; error: unknown }
  failUpdate?: (patch: Record<string, unknown>) => boolean
}) {
  const updates: Record<string, unknown>[] = []
  // deno-lint-ignore no-explicit-any
  const admin: any = {
    from() {
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
    storage: {
      from: () => ({
        download: () => Promise.resolve(opts.download ?? { data: null, error: { message: 'gone' } })
      })
    }
  }
  return { admin, updates }
}

const row = (over: Record<string, unknown>) => ({
  data: {
    id: 1,
    status: 'processing',
    phase: null,
    audio_path: 'm/a.mp3',
    script: 'original',
    lang: null,
    transcript: { text: '', segments: [], words: [] },
    ...over
  },
  error: null
})

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

Deno.test('translate phase: empty segments advance to transliterating', async () => {
  const { admin, updates } = makeAdmin({ load: row({ phase: 'translating' }) })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 1)
  assertEquals(updates[0].phase, 'transliterating')
})

Deno.test('transliterate phase: empty words settle the row to ready', async () => {
  const { admin, updates } = makeAdmin({ load: row({ phase: 'transliterating' }) })
  await processLessonPhase(admin, 1)
  assertEquals(updates.length, 1)
  assertEquals(updates[0].status, 'ready')
  assertEquals(updates[0].phase, null)
  assertEquals(updates[0].error_code, null)
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
