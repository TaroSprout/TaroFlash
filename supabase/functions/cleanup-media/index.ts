// supabase/functions/cleanup-media/index.ts
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 500

type MediaRow = { id: number; bucket: string; path: string }
type OrphanObject = { bucket: string; name: string }
type RemovalGroup = { paths: string[]; ids: number[] }

export type Sleep = (ms: number) => Promise<void>
export type SupabaseLike = {
  from: (table: string) => any
  storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<{ error: any }> } }
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }>
}

export type Deps = {
  supabase: SupabaseLike
  sleep?: Sleep
  retryAttempts?: number
}

async function withRetry<T>(fn: () => Promise<T>, attempts: number, sleep: Sleep): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < attempts - 1) await sleep(500 * Math.pow(2, i))
    }
  }

  throw lastError
}

// Content-addressed storage means one object can back many cards (the same
// image reused across cards / as a deck bg). A soft-deleted row only means
// "this card no longer uses the image" — the object must survive as long as
// any *active* row still references its (bucket, path). Partition the
// candidates accordingly:
//   - keepObjectIds: stale rows whose object is still referenced → delete the
//     row, leave the object.
//   - byBucket: orphaned objects (no active reference) → remove from storage,
//     then delete the rows. Paths are deduped per bucket so two stale rows
//     sharing an object trigger a single remove.
function partitionCandidates(rows: MediaRow[], stillReferenced: Set<string>) {
  const keepObjectIds: number[] = []
  const byBucket = new Map<string, RemovalGroup>()
  const seenPaths = new Set<string>()

  for (const row of rows) {
    const key = `${row.bucket}::${row.path}`
    if (stillReferenced.has(key)) {
      keepObjectIds.push(row.id)
      continue
    }

    const group = byBucket.get(row.bucket) ?? { paths: [], ids: [] }
    group.ids.push(row.id)
    if (!seenPaths.has(key)) {
      group.paths.push(row.path)
      seenPaths.add(key)
    }
    byBucket.set(row.bucket, group)
  }

  return { keepObjectIds, byBucket }
}

async function removeBucketObjects(
  supabase: SupabaseLike,
  bucket: string,
  paths: string[],
  attempts: number,
  sleep: Sleep
): Promise<string | null> {
  // media.path is the full storage key (`<member_id>/<sha256>.<ext>`), so it's
  // passed to storage.remove as-is — no member_id re-prefixing.
  try {
    await withRetry(
      () =>
        supabase.storage
          .from(bucket)
          .remove(paths)
          .then(({ error }) => {
            if (error) throw error
          }),
      attempts,
      sleep
    )
    return null
  } catch (err: any) {
    return `bucket=${bucket}: ${err?.message ?? err}`
  }
}

// A failed step short-circuits the handler to a 500; otherwise it reports how
// many rows it processed/skipped plus any per-bucket storage errors (a 207).
type SweepResult = {
  processed: number
  skipped: number
  storageErrors: string[]
  failure?: 'refcount_failed' | 'delete_failed'
}

// Reap objects whose only references are soft-deleted. Refcounts the candidate
// paths against still-active rows so a content-addressed object shared by
// several cards survives until the last active reference is gone.
async function sweepSoftDeleted(
  supabase: SupabaseLike,
  mediaRows: MediaRow[],
  attempts: number,
  sleep: Sleep
): Promise<SweepResult> {
  const candidatePaths = [...new Set(mediaRows.map((r) => r.path))]
  const { data: activeRows, error: refcountError } = await supabase
    .from('media')
    .select('bucket, path')
    .is('deleted_at', null)
    .in('path', candidatePaths)

  if (refcountError) {
    console.error('Error refcounting media:', refcountError)
    return { processed: 0, skipped: 0, storageErrors: [], failure: 'refcount_failed' }
  }

  const stillReferenced = new Set<string>(
    (activeRows ?? []).map((r: { bucket: string; path: string }) => `${r.bucket}::${r.path}`)
  )
  const { keepObjectIds, byBucket } = partitionCandidates(mediaRows, stillReferenced)

  const removedIds: number[] = []
  const storageErrors: string[] = []
  for (const [bucket, group] of byBucket) {
    const error = await removeBucketObjects(supabase, bucket, group.paths, attempts, sleep)
    if (error) {
      console.error('Storage delete failed after retries:', error)
      storageErrors.push(error)
      continue
    }
    removedIds.push(...group.ids)
  }

  const deletableIds = [...keepObjectIds, ...removedIds]
  if (deletableIds.length > 0) {
    const { error: deleteError } = await supabase.from('media').delete().in('id', deletableIds)
    if (deleteError) {
      console.error('Error deleting media rows:', deleteError)
      return { processed: 0, skipped: 0, storageErrors, failure: 'delete_failed' }
    }
  }

  return {
    processed: deletableIds.length,
    skipped: mediaRows.length - deletableIds.length,
    storageErrors
  }
}

// Reap true orphans: objects in media-tracked buckets that never had a media row
// (e.g. a blocked or failed upload). The soft-deleted sweep can't see these — it
// starts from existing rows. A scan failure is logged and swallowed so the
// soft-deleted work still reports; per-bucket delete failures surface as a 207.
async function reapOrphans(
  supabase: SupabaseLike,
  attempts: number,
  sleep: Sleep
): Promise<{ orphansRemoved: number; storageErrors: string[] }> {
  const { data: orphans, error } = await supabase.rpc('find_orphan_storage_objects', {
    p_limit: BATCH_SIZE
  })

  if (error) {
    console.error('Error scanning for orphan objects:', error)
    return { orphansRemoved: 0, storageErrors: [] }
  }

  const byBucket = new Map<string, string[]>()
  for (const { bucket, name } of (orphans ?? []) as OrphanObject[]) {
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), name])
  }

  let orphansRemoved = 0
  const storageErrors: string[] = []
  for (const [bucket, paths] of byBucket) {
    const error = await removeBucketObjects(supabase, bucket, paths, attempts, sleep)
    if (error) {
      console.error('Orphan delete failed after retries:', error)
      storageErrors.push(error)
      continue
    }
    orphansRemoved += paths.length
  }

  return { orphansRemoved, storageErrors }
}

export async function handler({ supabase, sleep, retryAttempts = 3 }: Deps): Promise<Response> {
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const storageErrors: string[] = []
  let processed = 0
  let skipped = 0

  const { data: mediaRows, error: selectError } = await supabase
    .from('media')
    .select('id, bucket, path')
    .not('deleted_at', 'is', null)
    .limit(BATCH_SIZE)

  if (selectError) {
    console.error('Error selecting media:', selectError)
    return new Response(JSON.stringify({ error: 'select_failed' }), { status: 500 })
  }

  if (mediaRows && mediaRows.length > 0) {
    const swept = await sweepSoftDeleted(supabase, mediaRows, retryAttempts, wait)
    if (swept.failure) {
      const body =
        swept.failure === 'delete_failed'
          ? { error: swept.failure, storage_errors: swept.storageErrors }
          : { error: swept.failure }
      return new Response(JSON.stringify(body), { status: 500 })
    }
    processed = swept.processed
    skipped = swept.skipped
    storageErrors.push(...swept.storageErrors)
  }

  const reaped = await reapOrphans(supabase, retryAttempts, wait)
  storageErrors.push(...reaped.storageErrors)

  const status = storageErrors.length > 0 ? 207 : 200
  return new Response(
    JSON.stringify({
      message: 'Media cleanup complete',
      processed,
      skipped,
      orphans_removed: reaped.orphansRemoved,
      ...(storageErrors.length > 0 && { storage_errors: storageErrors })
    }),
    { status }
  )
}

if (import.meta.main) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  Deno.serve(() => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
    return handler({ supabase })
  })
}
