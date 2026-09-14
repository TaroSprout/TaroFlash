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

Deno.test('retry action: a failed row with a phase resumes in place — no sentence delete, phase/cursor untouched', async () => {
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
        eq: () => ({
          single: () =>
            // A row that died mid-translate: phase and cursor recorded, ready to resume.
            Promise.resolve({
              data: { id: 7, phase: 'translating', chunk_cursor: 40 },
              error: null
            })
        })
      })
    })
  }

  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ action: 'retry', lesson_id: 7 })
  })

  const res = await handler(req, {
    requireCapability: () => Promise.resolve({ user: { id: 'member-1' }, admin, userClient })
  })

  assertEquals(res.status, 202)
  // No delete at all — a phased failure never touches stored sentences.
  assertEquals(deleted, [])
  assertEquals(updates.length, 1)
  // Only status/error_code are flipped; phase and chunk_cursor are absent from
  // the patch, so the row's stage position stays exactly where it died.
  assertEquals(updates[0].status, 'processing')
  assertEquals('phase' in updates[0], false)
  assertEquals('chunk_cursor' in updates[0], false)
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

// A fake JWT good enough for assertServiceRole: it only reads the base64url
// payload segment, never verifies the signature.
function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

Deno.test('process action bypasses the capability gate entirely (no Authorization header -> 401)', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ action: 'process', lesson_id: 1 })
  })

  const res = await handler(req, {
    requireCapability: () => {
      throw new Error('requireCapability must not be called for the process action')
    }
  })

  // No Authorization header at all, so assertServiceRole rejects on the
  // missing-role branch before the capability gate is ever reached.
  assertEquals(res.status, 401)
})

Deno.test('process action bypasses the capability gate entirely (non-service-role JWT -> 403)', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fakeJwt({ role: 'authenticated' })}` },
    body: JSON.stringify({ action: 'process', lesson_id: 1 })
  })

  const res = await handler(req, {
    requireCapability: () => {
      throw new Error('requireCapability must not be called for the process action')
    }
  })

  // A real member token clears the JWT check at the gateway but fails the
  // role check, still without ever reaching the capability gate.
  assertEquals(res.status, 403)
})

// A valid service_role token falls through assertServiceRole and into
// processLessonPhase(serviceClient(), ...), which builds a real Supabase
// client and hits the network. Deps only injects requireCapability, not the
// worker, so there's no seam to reach that branch without live I/O — left
// uncovered here rather than faked.
