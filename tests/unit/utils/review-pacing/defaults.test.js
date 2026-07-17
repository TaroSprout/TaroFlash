import { describe, test, expect } from 'vite-plus/test'
import {
  LEARNING_STEP_PRESETS,
  RELEARNING_STEP_PRESETS,
  keyForSteps,
  FSRS_MAX_INTERVAL,
  DEFAULT_LEECH_THRESHOLD,
  LEECH_THRESHOLD_BOUNDS,
  MAX_INTERVAL_BOUNDS
} from '@/utils/review-pacing/defaults'

describe('review-pacing constants', () => {
  test('FSRS_MAX_INTERVAL matches ts-fsrs default maximum_interval (~100 years)', () => {
    expect(FSRS_MAX_INTERVAL).toBe(36500)
  })

  test('DEFAULT_LEECH_THRESHOLD mirrors the system preset default', () => {
    expect(DEFAULT_LEECH_THRESHOLD).toBe(8)
  })

  test('LEECH_THRESHOLD_BOUNDS has no 0/uncapped sentinel (min starts at 1)', () => {
    expect(LEECH_THRESHOLD_BOUNDS.min).toBe(1)
    expect(LEECH_THRESHOLD_BOUNDS.max).toBe(99)
    expect(LEECH_THRESHOLD_BOUNDS.step).toBe(1)
  })

  test('MAX_INTERVAL_BOUNDS min is 0, the "uncapped" UI sentinel, and max is FSRS_MAX_INTERVAL', () => {
    expect(MAX_INTERVAL_BOUNDS.min).toBe(0)
    expect(MAX_INTERVAL_BOUNDS.max).toBe(FSRS_MAX_INTERVAL)
    expect(MAX_INTERVAL_BOUNDS.step).toBe(15)
  })
})

describe('keyForSteps', () => {
  test('matches an exact learning-steps array to its preset key', () => {
    expect(keyForSteps(LEARNING_STEP_PRESETS, ['1m', '10m'], '10m')).toBe('1m-10m')
  })

  test('matches a single-step learning array', () => {
    expect(keyForSteps(LEARNING_STEP_PRESETS, ['1d'], '10m')).toBe('1d')
  })

  test('matches an exact relearning-steps array to its preset key', () => {
    expect(keyForSteps(RELEARNING_STEP_PRESETS, ['1m', '10m'], '10m')).toBe('1m-10m')
  })

  test('falls back when no preset has the same length', () => {
    expect(keyForSteps(LEARNING_STEP_PRESETS, ['1m', '10m', '1d', '2d'], '10m')).toBe('10m')
  })

  test('falls back when length matches but values differ', () => {
    expect(keyForSteps(LEARNING_STEP_PRESETS, ['5m', '20m'], '10m')).toBe('10m')
  })

  test('falls back on an empty steps array', () => {
    expect(keyForSteps(LEARNING_STEP_PRESETS, [], '10m')).toBe('10m')
  })
})
