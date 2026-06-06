import { assertEquals } from '@std/assert'
import { translateSentences } from './translate.ts'

// Anthropic's success envelope: a structured-output JSON string in content[0].text.
function ok(translations: string[]): Response {
  return new Response(JSON.stringify({ content: [{ text: JSON.stringify({ translations }) }] }), {
    status: 200
  })
}

// Replace global fetch with a responder that sees each batch's sentence count
// (parsed from the prompt) and its 0-based call index, then restore afterwards.
async function withFetch(
  responder: (sentenceCount: number, callIndex: number) => Response,
  run: () => Promise<void>
) {
  const realFetch = globalThis.fetch
  let call = 0
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string)
    const prompt = body.messages[0].content as string
    const count = Number(prompt.match(/Sentences \((\d+)\)/)?.[1] ?? 0)
    return Promise.resolve(responder(count, call++))
  }) as typeof fetch
  try {
    await run()
  } finally {
    globalThis.fetch = realFetch
  }
}

Deno.test('returns one translation per sentence, in order', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count }, (_, k) => `t${k}`)),
    async () => {
      const result = await translateSentences(['a', 'b', 'c'], 'English')
      assertEquals(result, ['t0', 't1', 't2'])
    }
  )
})

Deno.test('batches large inputs and concatenates in order (BATCH_SIZE = 25)', async () => {
  const sentences = Array.from({ length: 30 }, (_, k) => `s${k}`)
  let calls = 0

  await withFetch(
    (count, callIndex) => {
      calls = callIndex + 1
      return ok(Array.from({ length: count }, (_, k) => `c${callIndex}_${k}`))
    },
    async () => {
      const result = await translateSentences(sentences, 'English')

      assertEquals(calls, 2) // 25 + 5
      assertEquals(result?.length, 30)
      assertEquals(result?.[0], 'c0_0')
      assertEquals(result?.[24], 'c0_24')
      assertEquals(result?.[25], 'c1_0') // second batch picks up right after the first
      assertEquals(result?.[29], 'c1_4')
    }
  )
})

Deno.test('returns null when a batch returns the wrong number of translations', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count - 1 }, (_, k) => `t${k}`)),
    async () => {
      assertEquals(await translateSentences(['a', 'b', 'c'], 'English'), null)
    }
  )
})

Deno.test('returns null on a truncated (max_tokens) response', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [] }), { status: 200 }),
    async () => {
      assertEquals(await translateSentences(['a'], 'English'), null)
    }
  )
})

Deno.test('returns null on a refusal', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }), { status: 200 }),
    async () => {
      assertEquals(await translateSentences(['a'], 'English'), null)
    }
  )
})

Deno.test('returns null on a non-2xx upstream response', async () => {
  await withFetch(
    () => new Response('upstream boom', { status: 500 }),
    async () => {
      assertEquals(await translateSentences(['a'], 'English'), null)
    }
  )
})

Deno.test('returns null when the model body is not parseable JSON', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ content: [{ text: 'not json' }] }), { status: 200 }),
    async () => {
      assertEquals(await translateSentences(['a'], 'English'), null)
    }
  )
})

Deno.test('fails the whole request when a later batch fails (all-or-nothing)', async () => {
  const sentences = Array.from({ length: 30 }, (_, k) => `s${k}`)

  await withFetch(
    // First batch (25) succeeds, second batch (5) returns the wrong count.
    (count, callIndex) =>
      callIndex === 0 ? ok(Array.from({ length: count }, (_, k) => `t${k}`)) : ok(['only-one']),
    async () => {
      assertEquals(await translateSentences(sentences, 'English'), null)
    }
  )
})
