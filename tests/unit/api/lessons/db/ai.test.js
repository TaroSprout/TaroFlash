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

import {
  startLessonTranscription,
  retryLessonTranscription,
  translateTerm,
  EdgeFunctionError
} from '@/api/lessons/db/ai'

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

describe('startLessonTranscription', () => {
  const args = {
    collection_id: 7,
    title: 'Lesson One',
    audio_path: 'member/abc.m4a',
    script: 'original'
  }

  test('returns the lesson from the response body on success', async () => {
    const lesson = { id: 1, status: 'processing', title: 'Lesson One' }
    invokeMock.mockResolvedValueOnce({ data: { lesson }, error: null })

    const result = await startLessonTranscription(args)
    expect(result).toEqual(lesson)
  })

  test('invokes transcribe-lesson with the start action and args', async () => {
    invokeMock.mockResolvedValueOnce({ data: { lesson: { id: 1 } }, error: null })
    await startLessonTranscription(args)

    const [name, opts] = invokeMock.mock.calls[0]
    expect(name).toBe('transcribe-lesson')
    expect(opts.body).toEqual({ action: 'start', ...args })
  })

  test('throws EdgeFunctionError with the parsed code on failure', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: makeErrorWithContext({ code: 'create_failed' })
    })

    await expect(startLessonTranscription(args)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'create_failed'
    )
  })

  test('throws EdgeFunctionError "unknown" when the context body is unparseable', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: makeErrorWithBadContext() })

    await expect(startLessonTranscription(args)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'unknown'
    )
  })

  test('throws EdgeFunctionError "unknown" when the error has no context', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: makeErrorWithNoContext() })

    await expect(startLessonTranscription(args)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'unknown'
    )
  })

  test('throws EdgeFunctionError "no_data" when data and error are both null', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: null })

    await expect(startLessonTranscription(args)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'no_data'
    )
  })
})

describe('retryLessonTranscription', () => {
  test('returns the lesson from the response body on success', async () => {
    const lesson = { id: 9, status: 'processing' }
    invokeMock.mockResolvedValueOnce({ data: { lesson }, error: null })

    const result = await retryLessonTranscription(9)
    expect(result).toEqual(lesson)
  })

  test('invokes transcribe-lesson with the retry action and lesson_id', async () => {
    invokeMock.mockResolvedValueOnce({ data: { lesson: { id: 9 } }, error: null })
    await retryLessonTranscription(9)

    const [name, opts] = invokeMock.mock.calls[0]
    expect(name).toBe('transcribe-lesson')
    expect(opts.body).toEqual({ action: 'retry', lesson_id: 9 })
  })

  test('throws EdgeFunctionError with the parsed code on failure', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: makeErrorWithContext({ code: 'not_found' })
    })

    await expect(retryLessonTranscription(9)).rejects.toSatisfy(
      (e) => e instanceof EdgeFunctionError && e.code === 'not_found'
    )
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
