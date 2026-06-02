import { assertEquals } from '@std/assert'
import { makeFakeSupabase, noSleep } from '../_shared/test-utils.ts'
import { handler } from './index.ts'

type MediaRow = { id: number; bucket: string; path: string }

Deno.test('returns 200 with no-rows message when nothing to clean', async () => {
  const { supabase, calls } = makeFakeSupabase({ rows: [] })

  const res = await handler({ supabase, sleep: noSleep })

  assertEquals(res.status, 200)
  assertEquals(await res.json(), { message: 'No media to clean' })
  assertEquals(calls.removed.length, 0)
  assertEquals(calls.deletedIds.length, 0)
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
  assertEquals(await res.json(), { message: 'Media cleanup complete', processed: 3, skipped: 0 })

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
  assertEquals(await res.json(), { message: 'Media cleanup complete', processed: 1, skipped: 0 })
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
