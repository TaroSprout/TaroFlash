import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    functions: {
      invoke: invokeMock
    }
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { transcribeAudio, translateTerm, EdgeFunctionError } from '@/api/lessons/db/ai'

beforeEach(() => {
  invokeMock.mockReset()
})

// Helper: build a fake FunctionsHttpError-like object with a context Response
function makeErrorWithContext(body) {
  return {
    context: {
      json: () => Promise.resolve(body)
    }
  }
}

function makeErrorWithBadContext() {
  return {
    context: {
      json: () => Promise.reject(new SyntaxError('bad json'))
    }
  }
}

function makeErrorWithNoContext() {
  return {}
}

describe('transcribeAudio', () => {
  test('returns data on success', async () => {
    const data = { text: 'Hello', segments: [], lang: 'ja' }
    invokeMock.mockResolvedValueOnce({ data, error: null })

    const result = await transcribeAudio(new File(['x'], 'a.mp3'))
    expect(result).toEqual(data)
  })

  test('throws EdgeFunctionError with parsed code when error has a context body', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: makeErrorWithContext({ code: 'output_truncated' })
    })

    await expect(transcribeAudio(new File(['x'], 'a.mp3'))).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'output_truncated'
    )
  })

  test('throws EdgeFunctionError with code "unknown" when context body is unparseable', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: makeErrorWithBadContext()
    })

    await expect(transcribeAudio(new File(['x'], 'a.mp3'))).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'unknown'
    )
  })

  test('throws EdgeFunctionError with code "unknown" when error has no context', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: makeErrorWithNoContext()
    })

    await expect(transcribeAudio(new File(['x'], 'a.mp3'))).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'unknown'
    )
  })

  test('throws EdgeFunctionError with code "no_data" when data is null and error is null', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: null })

    await expect(transcribeAudio(new File(['x'], 'a.mp3'))).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'no_data'
    )
  })

  test('invokes the transcribe-audio edge function with a FormData body', async () => {
    const data = { text: 'hi', segments: [] }
    invokeMock.mockResolvedValueOnce({ data, error: null })

    const file = new File(['audio'], 'clip.mp3')
    await transcribeAudio(file)

    const [name, opts] = invokeMock.mock.calls[0]
    expect(name).toBe('transcribe-audio')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(opts.body.get('file')).toBe(file)
  })
})

describe('translateTerm', () => {
  const args = { term: '猫', sentence: '猫がいる', target_lang: 'en' }

  test('returns data on success', async () => {
    const data = { translation: 'cat', reading: 'ねこ', pos: 'noun', description: 'A cat.' }
    invokeMock.mockResolvedValueOnce({ data, error: null })

    const result = await translateTerm(args)
    expect(result).toEqual(data)
  })

  test('invokes the translate-term edge function with the args as body', async () => {
    invokeMock.mockResolvedValueOnce({ data: { translation: 'cat' }, error: null })
    await translateTerm(args)

    const [name, opts] = invokeMock.mock.calls[0]
    expect(name).toBe('translate-term')
    expect(opts.body).toEqual(args)
  })

  test('throws EdgeFunctionError with parsed code on failure', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: makeErrorWithContext({ code: 'file_too_large' })
    })

    await expect(translateTerm(args)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'file_too_large'
    )
  })

  test('throws EdgeFunctionError with code "unknown" when context body has no code field', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: makeErrorWithContext({ message: 'something else' })
    })

    await expect(translateTerm(args)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'unknown'
    )
  })

  test('throws EdgeFunctionError with code "no_data" when data is null and error is null', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: null })

    await expect(translateTerm(args)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'no_data'
    )
  })
})
