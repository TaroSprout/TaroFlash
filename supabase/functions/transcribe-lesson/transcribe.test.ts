import { assertEquals, assertRejects } from '@std/assert'
import { transcribeAudioFile, TranscribeError } from './transcribe.ts'

const FILE = new File(['audio'], 'clip.mp3')

const whisperOk = () =>
  new Response(
    JSON.stringify({
      text: 'hi',
      language: 'en',
      segments: [{ start: 0, end: 1, text: ' hi ' }],
      words: [{ word: 'hi', start: 0, end: 1 }]
    }),
    { status: 200 }
  )

// Swap globalThis.fetch for a queue of responses, returning a call counter and a
// restore fn. The last queued response repeats once the queue is exhausted.
function stubFetch(queue: (() => Response)[]) {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = () => {
    const make = queue[Math.min(calls, queue.length - 1)]
    calls++
    return Promise.resolve(make())
  }
  return {
    callCount: () => calls,
    restore: () => {
      globalThis.fetch = original
    }
  }
}

Deno.test('returns the shaped, trimmed transcript on success', async () => {
  const fetchStub = stubFetch([whisperOk])
  try {
    const result = await transcribeAudioFile(FILE, 'original')
    assertEquals(result.text, 'hi')
    assertEquals(result.segments[0].text, 'hi')
    assertEquals(result.words[0].word, 'hi')
    assertEquals(result.lang, 'en')
    assertEquals(fetchStub.callCount(), 1)
  } finally {
    fetchStub.restore()
  }
})

Deno.test('maps a 413 to file_too_large without retrying', async () => {
  const fetchStub = stubFetch([() => new Response('too big', { status: 413 })])
  try {
    await assertRejects(
      () => transcribeAudioFile(FILE, 'original'),
      TranscribeError,
      'file_too_large'
    )
    assertEquals(fetchStub.callCount(), 1)
  } finally {
    fetchStub.restore()
  }
})

Deno.test('maps a 400 to invalid_audio without retrying', async () => {
  const fetchStub = stubFetch([() => new Response('bad', { status: 400 })])
  try {
    await assertRejects(
      () => transcribeAudioFile(FILE, 'original'),
      TranscribeError,
      'invalid_audio'
    )
    assertEquals(fetchStub.callCount(), 1)
  } finally {
    fetchStub.restore()
  }
})

Deno.test('retries a 429 then succeeds', async () => {
  const fetchStub = stubFetch([() => new Response('busy', { status: 429 }), whisperOk])
  try {
    const result = await transcribeAudioFile(FILE, 'original')
    assertEquals(result.text, 'hi')
    assertEquals(fetchStub.callCount(), 2)
  } finally {
    fetchStub.restore()
  }
})

Deno.test('gives up with rate_limited after exhausting retries on 429', async () => {
  const fetchStub = stubFetch([() => new Response('busy', { status: 429 })])
  try {
    await assertRejects(
      () => transcribeAudioFile(FILE, 'original'),
      TranscribeError,
      'rate_limited'
    )
    assertEquals(fetchStub.callCount(), 3)
  } finally {
    fetchStub.restore()
  }
})
