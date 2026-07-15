import { assertEquals } from '@std/assert'
import { handler } from './index.ts'

// The gate call site is the only thing this branch changed (requireAdmin ->
// requireCapability). Full handler coverage (translateSentences call) is out
// of proportion to that change.

Deno.test('returns the gate response when the capability check is denied', async () => {
  const forbidden = new Response('Forbidden', { status: 403 })
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ sentences: ['hi'], target_lang: 'en' })
  })

  const res = await handler(req, { requireCapability: () => Promise.resolve({ error: forbidden }) })

  assertEquals(res.status, 403)
})
