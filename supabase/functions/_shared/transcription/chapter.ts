// Chapter detection for the audio reader. Given the finished, stitched transcript
// segments, asks Claude to split them into titled chapters — spotting spoken
// chapter cues ("Chapter One", a title read aloud) and, failing those, clear
// topic/scene shifts. Best-effort: returns null on any failure so the lesson
// still completes (just without chapters), exactly like the other enrichers.

import { requestStructured } from './anthropic.ts'

const MODEL = 'claude-haiku-4-5'

// Each segment line is trimmed to its opening words: a chapter boundary hinges on
// how a segment STARTS, not its full body, and trimming keeps a long book's
// prompt to a sane size.
const SNIPPET_CHARS = 120

// The model returns the segment index each chapter starts on (chosen from the
// indices we hand it), which we map back to that segment's audio start time. The
// schema can't pin indices to the valid range, so we validate every one below.
const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    chapters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          start_index: { type: 'integer' }
        },
        required: ['title', 'start_index'],
        additionalProperties: false
      }
    }
  },
  required: ['chapters'],
  additionalProperties: false
}

const SYSTEM_PROMPT =
  'You split an audiobook transcript into chapters. You are given numbered ' +
  'transcript segments. Decide where each chapter begins — prefer explicit spoken ' +
  'markers (e.g. "Chapter One", a heading read aloud) and otherwise clear topic or ' +
  'scene shifts. Return chapters in order, each with a short human-readable title ' +
  "in the transcript's own language and the index of the segment it starts on. The " +
  'first chapter must start at index 0, indices must strictly increase, and every ' +
  'index must be one of the given segment numbers. If the audio is one continuous ' +
  'piece with no real chapter breaks, return exactly one chapter covering all of it.'

type RawChapter = { title?: unknown; start_index?: unknown }

export type Chapter = { title: string; start: number }

export async function detectChapters(
  segments: { start: number; text: string }[]
): Promise<Chapter[] | null> {
  if (segments.length === 0) return null

  const numbered = segments
    .map((s, i) => `${i}\t[${formatClock(s.start)}] ${s.text.slice(0, SNIPPET_CHARS)}`)
    .join('\n')
  const prompt =
    `Segments (${segments.length}), one per line as "index<TAB>[mm:ss] text":\n` + numbered

  const raw = await requestStructured({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt,
    schema: RESULT_SCHEMA
  })
  if (raw === null) return null

  let chapters: unknown
  try {
    chapters = (JSON.parse(raw) as { chapters?: unknown }).chapters
  } catch {
    console.error('Unparseable chapter response', raw)
    return null
  }
  if (!Array.isArray(chapters) || chapters.length === 0) return null

  // Map each model-chosen index back to its audio start time, dropping any index
  // that's out of range or not strictly after the previous one.
  const result: Chapter[] = []
  let lastIndex = -1
  for (const c of chapters as RawChapter[]) {
    const idx = Math.trunc(Number(c?.start_index))
    if (!Number.isFinite(idx) || idx <= lastIndex || idx < 0 || idx >= segments.length) continue
    const title = typeof c?.title === 'string' ? c.title.trim() : ''
    if (!title) continue
    result.push({ title, start: segments[idx].start })
    lastIndex = idx
  }
  if (result.length === 0) return null

  // The first chapter always covers from the very start, whatever index the model
  // picked, so the reader's first jump-target is 0.
  result[0] = { ...result[0], start: 0 }
  return result
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
