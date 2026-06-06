import { assertEquals } from '@std/assert'
import { readSentences } from './transliterate.ts'

// Anthropic's success envelope: a structured-output JSON string in content[0].text.
function ok(readings: string[]): Response {
  return new Response(JSON.stringify({ content: [{ text: JSON.stringify({ readings }) }] }), {
    status: 200
  })
}

// A sentence carrying `n` synthetic word tokens.
function sentence(text: string, n: number) {
  return { text, words: Array.from({ length: n }, (_, k) => `${text}${k}`) }
}

// Replace global fetch with a responder that sees each batch's token count
// (parsed from the prompt) and its 0-based call index, then restore afterwards.
async function withFetch(
  responder: (tokenCount: number, callIndex: number) => Response,
  run: () => Promise<void>
) {
  const realFetch = globalThis.fetch
  let call = 0
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string)
    const prompt = body.messages[0].content as string
    const count = Number(prompt.match(/Return (\d+) readings/)?.[1] ?? 0)
    return Promise.resolve(responder(count, call++))
  }) as typeof fetch
  try {
    await run()
  } finally {
    globalThis.fetch = realFetch
  }
}

Deno.test('returns one reading per token, in order', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count }, (_, k) => `r${k}`)),
    async () => {
      const result = await readSentences(
        [{ text: '猫が好き', words: ['猫', 'が', '好き'] }],
        'Japanese'
      )
      assertEquals(result, ['r0', 'r1', 'r2'])
    }
  )
})

Deno.test('flattens readings across sentences in order', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count }, (_, k) => `r${k}`)),
    async () => {
      const result = await readSentences(
        [
          { text: 'A', words: ['a1', 'a2'] },
          { text: 'B', words: ['b1'] }
        ],
        'Japanese'
      )
      assertEquals(result, ['r0', 'r1', 'r2'])
    }
  )
})

Deno.test('skips empty sentences so output aligns to non-empty words', async () => {
  let calls = 0
  await withFetch(
    (count, callIndex) => {
      calls = callIndex + 1
      return ok(Array.from({ length: count }, (_, k) => `r${k}`))
    },
    async () => {
      const result = await readSentences(
        [
          { text: 'empty', words: [] },
          { text: '猫', words: ['猫'] }
        ],
        'Japanese'
      )
      assertEquals(calls, 1)
      assertEquals(result, ['r0'])
    }
  )
})

Deno.test('batches by token count and concatenates in order (cap 80)', async () => {
  const sentences = [sentence('a', 50), sentence('b', 50)] // 100 tokens
  let calls = 0

  await withFetch(
    (count, callIndex) => {
      calls = callIndex + 1
      return ok(Array.from({ length: count }, (_, k) => `c${callIndex}_${k}`))
    },
    async () => {
      const result = await readSentences(sentences, 'Japanese')

      assertEquals(calls, 2) // 50 + 50, the cap forces a split
      assertEquals(result?.length, 100)
      assertEquals(result?.[0], 'c0_0')
      assertEquals(result?.[49], 'c0_49')
      assertEquals(result?.[50], 'c1_0') // second batch picks up right after the first
      assertEquals(result?.[99], 'c1_49')
    }
  )
})

Deno.test('blanks a batch that returns the wrong number of readings', async () => {
  await withFetch(
    (count) => ok(Array.from({ length: count - 1 }, (_, k) => `r${k}`)),
    async () => {
      assertEquals(await readSentences([{ text: 'x', words: ['a', 'b', 'c'] }], 'Japanese'), [
        '',
        '',
        ''
      ])
    }
  )
})

Deno.test('blanks a batch on a truncated (max_tokens) response', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [] }), { status: 200 }),
    async () => {
      assertEquals(await readSentences([{ text: 'x', words: ['a'] }], 'Japanese'), [''])
    }
  )
})

Deno.test('blanks a batch on a refusal', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }), { status: 200 }),
    async () => {
      assertEquals(await readSentences([{ text: 'x', words: ['a'] }], 'Japanese'), [''])
    }
  )
})

Deno.test('blanks a batch on a non-2xx upstream response', async () => {
  await withFetch(
    () => new Response('upstream boom', { status: 500 }),
    async () => {
      assertEquals(await readSentences([{ text: 'x', words: ['a'] }], 'Japanese'), [''])
    }
  )
})

Deno.test('blanks a batch when the model body is not parseable JSON', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ content: [{ text: 'not json' }] }), { status: 200 }),
    async () => {
      assertEquals(await readSentences([{ text: 'x', words: ['a'] }], 'Japanese'), [''])
    }
  )
})

Deno.test('a failed batch yields blanks while other batches survive', async () => {
  const sentences = [sentence('a', 50), sentence('b', 50)]

  await withFetch(
    // First batch (50) succeeds, second batch (50) returns the wrong count.
    (count, callIndex) =>
      callIndex === 0 ? ok(Array.from({ length: count }, (_, k) => `r${k}`)) : ok(['only-one']),
    async () => {
      const result = await readSentences(sentences, 'Japanese')
      assertEquals(result.length, 100)
      assertEquals(result[0], 'r0')
      assertEquals(result[49], 'r49')
      assertEquals(result[50], '') // second batch blanked, not the whole lesson
      assertEquals(result[99], '')
    }
  )
})
