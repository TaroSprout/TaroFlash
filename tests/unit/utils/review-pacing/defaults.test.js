import { describe, test, expect } from 'vite-plus/test'
import {
  LEARNING_STEP_PRESETS,
  RELEARNING_STEP_PRESETS,
  keyForSteps
} from '@/utils/review-pacing/defaults'

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
