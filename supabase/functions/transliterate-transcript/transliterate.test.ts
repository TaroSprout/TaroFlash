import { assertEquals } from '@std/assert'
import { readWords } from './transliterate.ts'

// Anthropic's success envelope: a structured-output JSON string in content[0].text.
function ok(readings: string[]): Response {
  return new Response(JSON.stringify({ content: [{ text: JSON.stringify({ readings }) }] }), {
    status: 200
  })
}

// Replace global fetch with a responder that sees each batch's word count
// (parsed from the prompt) and its 0-based call index, then restore afterwards.
async function withFetch(
  responder: (wordCount: number, callIndex: number) => Response,
  run: () => Promise<void>
) {
  const realFetch = globalThis.fetch
  let call = 0
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string)
    const prompt = body.messages[0].content as string
    const count = Number(prompt.match(/Words \((\d+)\)/)?.[1] ?? 0)
    return Promise.resolve(responder(count, call++))
  }) as typeof fetch
  try {
    await run()
  } finally {
    globalThis.fetch = realFetch
  }
}

Deno.test('returns one reading per word, in order', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count }, (_, k) => `r${k}`)),
    async () => {
      const result = await readWords(['食べる', '猫', '。'], 'Japanese')
      assertEquals(result, ['r0', 'r1', 'r2'])
    }
  )
})

Deno.test('batches large inputs and concatenates in order (BATCH_SIZE = 50)', async () => {
  const words = Array.from({ length: 60 }, (_, k) => `w${k}`)
  let calls = 0

  await withFetch(
    (count, callIndex) => {
      calls = callIndex + 1
      return ok(Array.from({ length: count }, (_, k) => `c${callIndex}_${k}`))
    },
    async () => {
      const result = await readWords(words, 'Japanese')

      assertEquals(calls, 2) // 50 + 10
      assertEquals(result?.length, 60)
      assertEquals(result?.[0], 'c0_0')
      assertEquals(result?.[49], 'c0_49')
      assertEquals(result?.[50], 'c1_0') // second batch picks up right after the first
      assertEquals(result?.[59], 'c1_9')
    }
  )
})

Deno.test('returns null when a batch returns the wrong number of readings', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count - 1 }, (_, k) => `r${k}`)),
    async () => {
      assertEquals(await readWords(['a', 'b', 'c'], 'Japanese'), null)
    }
  )
})

Deno.test('returns null on a truncated (max_tokens) response', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [] }), { status: 200 }),
    async () => {
      assertEquals(await readWords(['a'], 'Japanese'), null)
    }
  )
})

Deno.test('returns null on a refusal', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }), { status: 200 }),
    async () => {
      assertEquals(await readWords(['a'], 'Japanese'), null)
    }
  )
})

Deno.test('returns null on a non-2xx upstream response', async () => {
  await withFetch(
    () => new Response('upstream boom', { status: 500 }),
    async () => {
      assertEquals(await readWords(['a'], 'Japanese'), null)
    }
  )
})

Deno.test('returns null when the model body is not parseable JSON', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ content: [{ text: 'not json' }] }), { status: 200 }),
    async () => {
      assertEquals(await readWords(['a'], 'Japanese'), null)
    }
  )
})

Deno.test('fails the whole request when a later batch fails (all-or-nothing)', async () => {
  const words = Array.from({ length: 60 }, (_, k) => `w${k}`)

  await withFetch(
    // First batch (50) succeeds, second batch (10) returns the wrong count.
    (count, callIndex) =>
      callIndex === 0 ? ok(Array.from({ length: count }, (_, k) => `r${k}`)) : ok(['only-one']),
    async () => {
      assertEquals(await readWords(words, 'Japanese'), null)
    }
  )
})
