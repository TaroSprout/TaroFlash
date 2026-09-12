import { assertAlmostEquals, assertEquals } from '@std/assert'
import { detectBreakStrengths } from './paragraph.ts'

// Anthropic's success envelope: a structured-output JSON string in content[0].text.
function ok(strengths: unknown[]): Response {
  return new Response(JSON.stringify({ content: [{ text: JSON.stringify({ strengths }) }] }), {
    status: 200
  })
}

// Replace global fetch with a responder that sees each batch's TARGET line count
// (parsed from the prompt) plus the raw prompt text (for context-window assertions)
// and its 0-based call index, then restore afterwards.
async function withFetch(
  responder: (sentenceCount: number, callIndex: number, prompt: string) => Response,
  run: () => Promise<void>
) {
  const realFetch = globalThis.fetch
  let call = 0
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string)
    const prompt = body.messages[0].content as string
    const count = Number(prompt.match(/TARGET \((\d+)/)?.[1] ?? 0)
    return Promise.resolve(responder(count, call++, prompt))
  }) as typeof fetch
  try {
    await run()
  } finally {
    globalThis.fetch = realFetch
  }
}

Deno.test('returns one strength per sentence, aligned in order', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count }, (_, k) => k / 10)),
    async () => {
      const result = await detectBreakStrengths(['a', 'b', 'c'])
      assertEquals(result, [0, 0.1, 0.2])
    }
  )
})

Deno.test('clamps an out-of-range score into [0, 1]', async () => {
  await withFetch(
    () => ok([-3, 4, 0.5]),
    async () => {
      const result = await detectBreakStrengths(['a', 'b', 'c'])
      assertEquals(result, [0, 1, 0.5])
    }
  )
})

Deno.test('a non-finite score is left as null rather than a bogus number', async () => {
  await withFetch(
    () => ok(['not-a-number', {}, 0.4]),
    async () => {
      const result = await detectBreakStrengths(['a', 'b', 'c'])
      assertEquals(result, [null, null, 0.4])
    }
  )
})

Deno.test('returns null for the whole batch when the model body is not parseable JSON', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ content: [{ text: 'not json' }] }), { status: 200 }),
    async () => {
      assertEquals(await detectBreakStrengths(['a', 'b', 'c']), null)
    }
  )
})

Deno.test('returns null when a batch returns the wrong number of strengths', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count - 1 }, (_, k) => k / 10)),
    async () => {
      assertEquals(await detectBreakStrengths(['a', 'b', 'c']), null)
    }
  )
})

Deno.test('returns null on a non-2xx upstream response', async () => {
  await withFetch(
    () => new Response('upstream boom', { status: 500 }),
    async () => {
      assertEquals(await detectBreakStrengths(['a']), null)
    }
  )
})

Deno.test('batches large inputs internally and concatenates in order (BATCH_SIZE = 40)', async () => {
  const sentences = Array.from({ length: 50 }, (_, k) => `s${k}`)

  await withFetch(
    // Values stay inside [0, 1] (clampStrength would otherwise flatten them),
    // encoding both the batch and the position within it as a fraction.
    (count, callIndex) => ok(Array.from({ length: count }, (_, k) => callIndex * 0.4 + k / 1000)),
    async () => {
      const result = await detectBreakStrengths(sentences)

      assertEquals(result?.length, 50)
      assertAlmostEquals(result?.[0] ?? NaN, 0) // first batch (40 lines), first entry
      assertAlmostEquals(result?.[39] ?? NaN, 0.039) // first batch's last entry
      assertAlmostEquals(result?.[40] ?? NaN, 0.4) // second batch picks up right after the first
      assertAlmostEquals(result?.[49] ?? NaN, 0.409)
    }
  )
})

Deno.test('fails the whole slice when a later internal batch fails', async () => {
  const sentences = Array.from({ length: 50 }, (_, k) => `s${k}`)

  await withFetch(
    // First batch (40) succeeds, second batch (10) returns the wrong count.
    (count, callIndex) =>
      callIndex === 0 ? ok(Array.from({ length: count }, (_, k) => k)) : ok([0.1]),
    async () => {
      assertEquals(await detectBreakStrengths(sentences), null)
    }
  )
})

Deno.test('a sentence at a slice edge is scored with lead/tail neighbours as context', async () => {
  await withFetch(
    (count, _callIndex, prompt) => {
      // Neighbours passed as lead/tail ride the prompt as context, not as TARGET
      // lines — the count parsed from "TARGET (n" must still match only the slice.
      assertEquals(prompt.includes('Context before:\nlead0\nlead1'), true)
      assertEquals(prompt.includes('Context after:\ntail0\ntail1'), true)
      return ok(Array.from({ length: count }, () => 0.5))
    },
    async () => {
      const result = await detectBreakStrengths(['a', 'b'], ['lead0', 'lead1'], ['tail0', 'tail1'])
      assertEquals(result, [0.5, 0.5])
    }
  )
})

Deno.test('an internal batch boundary pulls its neighbour context from across the boundary', async () => {
  // 45 sentences with CONTEXT_WINDOW = 5 and BATCH_SIZE = 40: the second batch's
  // "before" context must be the slice's own last 5 sentences (s35..s39), not lead.
  const sentences = Array.from({ length: 45 }, (_, k) => `s${k}`)

  await withFetch(
    (count, callIndex, prompt) => {
      if (callIndex === 1) {
        assertEquals(prompt.includes('Context before:\ns35\ns36\ns37\ns38\ns39'), true)
      }
      return ok(Array.from({ length: count }, () => 0.2))
    },
    async () => {
      const result = await detectBreakStrengths(sentences)
      assertEquals(result?.length, 45)
    }
  )
})
