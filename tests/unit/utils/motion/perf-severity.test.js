import { describe, test, expect } from 'vite-plus/test'
import { budgetRatioClass, fpsClass } from '@/utils/motion/perf-severity'

describe('budgetRatioClass', () => {
  test('reads plain just under the warn threshold', () => {
    expect(budgetRatioClass(0.49)).toBe('')
  })

  test('flags yellow at the warn threshold', () => {
    expect(budgetRatioClass(0.5)).toBe('text-yellow-700')
  })

  test('stays yellow just under the danger threshold', () => {
    expect(budgetRatioClass(0.74)).toBe('text-yellow-700')
  })

  test('flags red at the danger threshold', () => {
    expect(budgetRatioClass(0.75)).toBe('text-red-600')
  })
})

describe('fpsClass', () => {
  test('reads plain at the warn threshold', () => {
    expect(fpsClass(55)).toBe('')
  })

  test('flags yellow just under the warn threshold', () => {
    expect(fpsClass(54)).toBe('text-yellow-700')
  })

  test('stays yellow at the danger threshold', () => {
    expect(fpsClass(45)).toBe('text-yellow-700')
  })

  test('flags red just under the danger threshold', () => {
    expect(fpsClass(44)).toBe('text-red-600')
  })
})
