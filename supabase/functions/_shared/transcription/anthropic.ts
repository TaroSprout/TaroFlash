// Shared Claude (Anthropic) call for the transcription enrichers (translate +
// transliterate). Both post the same structured-output request shape and both
// must be best-effort, so the request, the timeout, and the failure handling
// live here once.
//
// The timeout is the important part: unlike the Whisper call, the old enricher
// requests had no AbortController, so a hung upstream would keep the worker
// running until the platform force-killed the isolate — stranding the lesson
// row mid-phase. Bounding the request turns that hang into a clean null the
// caller already knows how to absorb.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// A structured Haiku batch is small; a minute is generous headroom over normal
// latency while still failing fast enough to stay inside one phase's budget.
const REQUEST_TIMEOUT_MS = 60_000

export type StructuredRequest = {
  model: string
  system: string
  prompt: string
  // JSON Schema the response is constrained to (guarantees a parseable body).
  schema: object
}

// POST a structured-output request and return the model's raw text (the JSON
// string the schema produced), or null on ANY failure — HTTP error, refusal,
// truncation, timeout, or a dropped connection. Callers parse their own field
// from the text and treat null as "this batch didn't come back".
export async function requestStructured({
  model,
  system,
  prompt,
  schema
}: StructuredRequest): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        output_config: { format: { type: 'json_schema', schema } },
        messages: [{ role: 'user', content: prompt }]
      })
    })
  } catch (error) {
    console.error(
      'Anthropic request failed',
      controller.signal.aborted ? 'timeout' : 'network',
      error
    )
    return null
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    console.error('Anthropic error', res.status, await res.text())
    return null
  }

  const data = await res.json()
  if (data?.stop_reason === 'max_tokens' || data?.stop_reason === 'refusal') return null

  return data?.content?.[0]?.text ?? ''
}
