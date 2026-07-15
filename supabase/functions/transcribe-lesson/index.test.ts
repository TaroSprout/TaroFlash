import { assertEquals } from '@std/assert'
import { handler } from './index.ts'

// The gate call site is the only thing this branch changed (requireAdmin ->
// requireCapability). Full handler coverage (worker orchestration, chain
// trigger phases) is out of proportion to that change.

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
