import { assertEquals } from '@std/assert'
import { makeFakeSupabase, noSleep } from '../_shared/test-utils.ts'
import { handler } from './index.ts'

type MediaRow = { id: number; bucket: string; path: string }

Deno.test('completes with zero counts when there is nothing to clean', async () => {
  const { supabase, calls } = makeFakeSupabase({ rows: [] })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  assertEquals(await res.json(), {
    message: 'Media cleanup complete',
    processed: 0,
    skipped: 0,
    orphans_removed: 0
  })
  assertEquals(calls.removed.length, 0)
  assertEquals(calls.deletedIds.length, 0)
  // The orphan sweep runs even with no soft-deleted rows.
  assertEquals(calls.rpc.length, 1)
})

Deno.test('returns 500 on select error', async () => {
  const { supabase } = makeFakeSupabase({ selectError: { message: 'boom' } })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 500)
  assertEquals(await res.json(), { error: 'select_failed' })
})

Deno.test('returns 500 on refcount error', async () => {
  const rows: MediaRow[] = [{ id: 1, bucket: 'member-images', path: 'm1/a.png' }]
  const { supabase, calls } = makeFakeSupabase({ rows, refcountError: { message: 'boom' } })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 500)
  assertEquals(await res.json(), { error: 'refcount_failed' })
  assertEquals(calls.removed.length, 0)
})

Deno.test('removes orphaned objects grouped by bucket, uses path as-is, deletes rows', async () => {
  const rows: MediaRow[] = [
    { id: 1, bucket: 'member-images', path: 'm1/a.png' },
    { id: 2, bucket: 'member-images', path: 'm1/b.png' },
    { id: 3, bucket: 'avatars', path: 'm1/c.png' }
  ]
  const { supabase, calls } = makeFakeSupabase({ rows, activeRows: [] })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  assertEquals(await res.json(), {
    message: 'Media cleanup complete',
    processed: 3,
    skipped: 0,
    orphans_removed: 0
  })

  assertEquals(calls.removed.length, 2)
  const images = calls.removed.find((r) => r.bucket === 'member-images')
  assertEquals(images?.paths, ['m1/a.png', 'm1/b.png'])
  const avatars = calls.removed.find((r) => r.bucket === 'avatars')
  assertEquals(avatars?.paths, ['m1/c.png'])

  assertEquals(calls.deletedIds.length, 1)
  assertEquals(
    [...calls.deletedIds[0]].sort((a, b) => a - b),
    [1, 2, 3]
  )
})

Deno.test('keeps a shared object when an active row still references it, but deletes the stale row', async () => {
  const rows: MediaRow[] = [{ id: 1, bucket: 'member-images', path: 'm1/shared.png' }]
  const activeRows = [{ bucket: 'member-images', path: 'm1/shared.png' }]
  const { supabase, calls } = makeFakeSupabase({ rows, activeRows })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  assertEquals(await res.json(), {
    message: 'Media cleanup complete',
    processed: 1,
    skipped: 0,
    orphans_removed: 0
  })
  assertEquals(calls.removed.length, 0)
  assertEquals(calls.deletedIds, [[1]])
})

Deno.test('dedupes paths: two stale rows sharing an orphaned object trigger one remove', async () => {
  const rows: MediaRow[] = [
    { id: 1, bucket: 'member-images', path: 'm1/dup.png' },
    { id: 2, bucket: 'member-images', path: 'm1/dup.png' }
  ]
  const { supabase, calls } = makeFakeSupabase({ rows, activeRows: [] })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  assertEquals(calls.removed.length, 1)
  assertEquals(calls.removed[0].paths, ['m1/dup.png'])
  assertEquals(calls.deletedIds, [[1, 2]])
})

Deno.test('skipped bucket does not block others, returns 207', async () => {
  const rows: MediaRow[] = [
    { id: 1, bucket: 'member-images', path: 'm1/a.png' },
    { id: 2, bucket: 'avatars', path: 'm1/b.png' }
  ]
  const removeErrors = new Map([
    ['member-images', [{ message: 'fail' }, { message: 'fail' }, { message: 'fail' }]]
  ])
  const { supabase, calls } = makeFakeSupabase({ rows, activeRows: [], removeErrors })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 207)
  const body = await res.json()
  assertEquals(body.processed, 1)
  assertEquals(body.skipped, 1)
  assertEquals(body.storage_errors.length, 1)

  assertEquals(calls.deletedIds, [[2]])
})

Deno.test('retries transient storage failures before succeeding', async () => {
  const rows: MediaRow[] = [{ id: 1, bucket: 'member-images', path: 'm1/a.png' }]
  const removeErrors = new Map([
    ['member-images', [{ message: 'transient' }, { message: 'transient' }]]
  ])
  const { supabase, calls } = makeFakeSupabase({ rows, activeRows: [], removeErrors })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  assertEquals(calls.removed.length, 3)
  assertEquals(calls.deletedIds, [[1]])
})

Deno.test('reaps true orphans from the finder, grouped by bucket, deletes no rows', async () => {
  const orphans = [
    { bucket: 'member-images', name: 'm1/x.png' },
    { bucket: 'member-images', name: 'm1/y.png' },
    { bucket: 'audio-lessons', name: 'm2/z.mp3' }
  ]
  const { supabase, calls } = makeFakeSupabase({ rows: [], orphans })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.orphans_removed, 3)
  assertEquals(body.processed, 0)

  assertEquals(calls.removed.length, 2)
  assertEquals(calls.removed.find((r) => r.bucket === 'member-images')?.paths, [
    'm1/x.png',
    'm1/y.png'
  ])
  assertEquals(calls.removed.find((r) => r.bucket === 'audio-lessons')?.paths, ['m2/z.mp3'])
  // Orphans have no media row, so nothing is deleted from the table.
  assertEquals(calls.deletedIds.length, 0)
})

Deno.test('orphan scan error is logged but soft-deleted work still completes', async () => {
  const rows: MediaRow[] = [{ id: 1, bucket: 'member-images', path: 'm1/a.png' }]
  const { supabase, calls } = makeFakeSupabase({
    rows,
    activeRows: [],
    orphanError: { message: 'boom' }
  })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.processed, 1)
  assertEquals(body.orphans_removed, 0)
  // The soft-deleted object was still removed and its row deleted.
  assertEquals(calls.removed[0]?.paths, ['m1/a.png'])
  assertEquals(calls.deletedIds, [[1]])
})

Deno.test('orphan removal failure surfaces as 207 without blocking the rest', async () => {
  const orphans = [{ bucket: 'member-images', name: 'm1/x.png' }]
  const removeErrors = new Map([
    ['member-images', [{ message: 'fail' }, { message: 'fail' }, { message: 'fail' }]]
  ])
  const { supabase } = makeFakeSupabase({ rows: [], orphans, removeErrors })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 207)
  const body = await res.json()
  assertEquals(body.orphans_removed, 0)
  assertEquals(body.storage_errors.length, 1)
})

Deno.test('returns 500 when DB delete fails after storage success', async () => {
  const rows: MediaRow[] = [{ id: 1, bucket: 'member-images', path: 'm1/a.png' }]
  const { supabase } = makeFakeSupabase({
    rows,
    activeRows: [],
    deleteError: { message: 'db down' }
  })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 500)
  const body = await res.json()
  assertEquals(body.error, 'delete_failed')
})
