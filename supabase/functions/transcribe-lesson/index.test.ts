import { assertEquals } from '@std/assert'
import { handler } from './index.ts'

// The gate call site is the only thing this branch changed (requireAdmin ->
// requireCapability), plus handleRetry's sentence-clear step. Full handler
// coverage (worker orchestration, chain trigger phases) is out of proportion
// to that change.

Deno.test('start action: returns the gate response when the capability check is denied', async () => {
  const forbidden = new Response('Forbidden', { status: 403 })
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ action: 'start' })
  })

  const res = await handler(req, { requireCapability: () => Promise.resolve({ error: forbidden }) })

  assertEquals(res.status, 403)
})

Deno.test('retry action: returns the gate response when the capability check is denied', async () => {
  const unauthorized = new Response('Unauthorized', { status: 401 })
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ action: 'retry', lesson_id: 1 })
  })

  const res = await handler(req, {
    requireCapability: () => Promise.resolve({ error: unauthorized })
  })

  assertEquals(res.status, 401)
})

Deno.test('retry action: clears stored sentences before resetting the cursor', async () => {
  const deleted: { table: string; lesson_id: unknown }[] = []
  const updates: Record<string, unknown>[] = []

  // deno-lint-ignore no-explicit-any
  const admin: any = {
    from(table: string) {
      if (table === 'lesson_sentences') {
        return {
          delete: () => ({
            eq: (_col: string, id: unknown) => {
              deleted.push({ table, lesson_id: id })
              return Promise.resolve({ error: null })
            }
          })
        }
      }
      return {
        update: (patch: Record<string, unknown>) => ({
          eq: () => {
            updates.push(patch)
            return Promise.resolve({ error: null })
          }
        })
      }
    }
  }
  // deno-lint-ignore no-explicit-any
  const userClient: any = {
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { id: 42 }, error: null }) })
      })
    })
  }

  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ action: 'retry', lesson_id: 42 })
  })

  const res = await handler(req, {
    requireCapability: () => Promise.resolve({ user: { id: 'member-1' }, admin, userClient })
  })

  assertEquals(res.status, 202)
  // The delete lands before the reset write, so a resumed chain never appends
  // onto sentences the previous attempt left behind.
  assertEquals(deleted, [{ table: 'lesson_sentences', lesson_id: 42 }])
  assertEquals(updates.length, 1)
  assertEquals(updates[0].phase, 'transcribing')
  assertEquals(updates[0].chunk_cursor, 0)
})

Deno.test('process action bypasses the capability gate entirely (internal service-role call)', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ action: 'process', lesson_id: 1 })
  })

  const res = await handler(req, {
    requireCapability: () => {
      throw new Error('requireCapability must not be called for the process action')
    }
  })

  // No service-role Authorization header supplied, so it's rejected on that
  // check instead — proves the gate itself was never reached.
  assertEquals(res.status, 403)
})
