import { describe, test, expect } from 'vite-plus/test'
import { formatDuration } from '@/utils/reader/duration'

describe('formatDuration', () => {
  test('formats under an hour as M:SS', () => {
    expect(formatDuration(65)).toBe('1:05')
  })

  test('formats at an hour as H:MM:SS', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
  })

  test('formats past an hour as H:MM:SS', () => {
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  test('zero-pads minutes and seconds under an hour', () => {
    expect(formatDuration(5)).toBe('0:05')
  })

  test('zero-pads minutes and seconds past an hour', () => {
    expect(formatDuration(3605)).toBe('1:00:05')
  })

  test('clamps a negative value to 0:00', () => {
    expect(formatDuration(-10)).toBe('0:00')
  })

  test('clamps NaN to 0:00', () => {
    expect(formatDuration(NaN)).toBe('0:00')
  })

  test('clamps Infinity to 0:00', () => {
    expect(formatDuration(Infinity)).toBe('0:00')
  })

  test('floors a fractional seconds value', () => {
    expect(formatDuration(65.9)).toBe('1:05')
  })
})
