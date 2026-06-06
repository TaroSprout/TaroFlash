// Whisper has no script parameter and tends to emit Traditional characters for
// Mandarin, so we convert the transcript to the requested script after the fact
// with OpenCC. The standard t2s/s2t dictionaries map character-for-character
// (1:1), so converting the full text, each segment, and each word independently
// stays consistent — and Whisper's per-word timestamps remain aligned.

import { Converter } from 'npm:opencc-js@1.0.5'

export type TargetScript = 'original' | 'simplified' | 'traditional'

const PRESETS = {
  simplified: { from: 't', to: 'cn' },
  traditional: { from: 'cn', to: 't' }
} as const

export function isTargetScript(value: unknown): value is TargetScript {
  return value === 'original' || value === 'simplified' || value === 'traditional'
}

/**
 * Build a character-level converter for the target script, or null for
 * 'original' (no conversion). The returned function maps one string to its
 * converted form.
 */
export function scriptConverter(script: TargetScript): ((text: string) => string) | null {
  if (script === 'original') return null
  return Converter(PRESETS[script])
}
