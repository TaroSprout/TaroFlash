// Test fixtures shared across edge-function unit tests.
// Keep generic — function-specific behavior belongs in that function's test file.

export type FakeSupabaseOpts<Row> = {
  rows?: Row[]
  activeRows?: { bucket: string; path: string }[]
  orphans?: { bucket: string; name: string }[]
  selectError?: any
  refcountError?: any
  orphanError?: any
  removeErrors?: Map<string, any[]>
  deleteError?: any
}

export type FakeSupabaseCalls = {
  removed: { bucket: string; paths: string[] }[]
  deletedIds: number[][]
  rpc: { fn: string; args: any }[]
}

export type FakeSupabase = {
  from: (table: string) => any
  storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<{ error: any }> } }
  rpc: (fn: string, args?: any) => Promise<{ data: any; error: any }>
}

// Minimal supabase-js stand-in covering the surface our edge functions touch:
// `.from(t).select().not().limit()` (soft-deleted candidates),
// `.from(t).select().is().in()` (active-row refcount lookup),
// `.from(t).delete().in()`, `.storage.from(b).remove()`.
// Storage `remove` errors are queued per bucket so retries can be exercised.
export function makeFakeSupabase<Row>(opts: FakeSupabaseOpts<Row> = {}): {
  supabase: FakeSupabase
  calls: FakeSupabaseCalls
} {
  const calls: FakeSupabaseCalls = { removed: [], deletedIds: [], rpc: [] }
  const removeErrors = opts.removeErrors ?? new Map()
  const consumed = new Map<string, number>()

  const supabase: FakeSupabase = {
    from: (table: string) => ({
      select: () => ({
        not: () => ({
          limit: () =>
            Promise.resolve(
              opts.selectError
                ? { data: null, error: opts.selectError }
                : { data: opts.rows ?? [], error: null }
            )
        }),
        is: () => ({
          in: () =>
            Promise.resolve(
              opts.refcountError
                ? { data: null, error: opts.refcountError }
                : { data: opts.activeRows ?? [], error: null }
            )
        })
      }),
      delete: () => ({
        in: (_col: string, ids: number[]) => {
          if (table === 'media') calls.deletedIds.push(ids)
          return Promise.resolve({ error: opts.deleteError ?? null })
        }
      })
    }),
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          calls.removed.push({ bucket, paths })
          const queue = removeErrors.get(bucket) ?? []
          const idx = consumed.get(bucket) ?? 0
          consumed.set(bucket, idx + 1)
          const error = queue[idx] ?? null
          return Promise.resolve({ error })
        }
      })
    },
    rpc: (fn: string, args?: any) => {
      calls.rpc.push({ fn, args })
      return Promise.resolve(
        opts.orphanError
          ? { data: null, error: opts.orphanError }
          : { data: opts.orphans ?? [], error: null }
      )
    }
  }

  return { supabase, calls }
}

export const noSleep = () => Promise.resolve()
