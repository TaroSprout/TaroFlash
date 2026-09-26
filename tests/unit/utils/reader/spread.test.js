import { describe, test, expect } from 'vite-plus/test'
import {
  isTwoPage,
  pageWidth,
  spreadCount,
  spreadOfPage,
  slotsForSpread,
  TWO_PAGE_MIN_WIDTH
} from '@/utils/reader/spread'

describe('isTwoPage', () => {
  test('is false just under the threshold', () => {
    expect(isTwoPage(TWO_PAGE_MIN_WIDTH - 1)).toBe(false)
  })

  test('is true at and above the threshold', () => {
    expect(isTwoPage(TWO_PAGE_MIN_WIDTH)).toBe(true)
    expect(isTwoPage(TWO_PAGE_MIN_WIDTH + 100)).toBe(true)
  })
})

describe('pageWidth', () => {
  test('single-page mode returns the full viewport width', () => {
    expect(pageWidth(500, false)).toBe(500)
  })

  test('two-page mode halves the width after subtracting the gap', () => {
    expect(pageWidth(TWO_PAGE_MIN_WIDTH, true)).toBe((TWO_PAGE_MIN_WIDTH - 40) / 2)
  })

  test('two-page mode clamps to zero rather than going negative', () => {
    expect(pageWidth(10, true)).toBe(0)
  })
})

describe('spreadCount', () => {
  test('is 0 when there are no pages', () => {
    expect(spreadCount(0, false)).toBe(0)
    expect(spreadCount(-3, true)).toBe(0)
  })

  test('single-page mode is one spread per page', () => {
    expect(spreadCount(5, false)).toBe(5)
  })

  test('two-page mode ceils the half', () => {
    expect(spreadCount(5, true)).toBe(3)
    expect(spreadCount(4, true)).toBe(2)
  })
})

describe('spreadOfPage', () => {
  test('negative page index falls back to spread 0', () => {
    expect(spreadOfPage(-1, true)).toBe(0)
  })

  test('single-page mode maps page index directly to spread', () => {
    expect(spreadOfPage(3, false)).toBe(3)
  })

  test('two-page mode floors the half', () => {
    expect(spreadOfPage(0, true)).toBe(0)
    expect(spreadOfPage(1, true)).toBe(0)
    expect(spreadOfPage(2, true)).toBe(1)
  })
})

describe('slotsForSpread', () => {
  test('single-page mode returns one primary slot when in range', () => {
    expect(slotsForSpread(1, 5, false)).toEqual([{ page_index: 1, primary: true }])
  })

  test('single-page mode returns no slots once past the page count', () => {
    expect(slotsForSpread(5, 5, false)).toEqual([])
  })

  test('two-page mode returns primary and secondary slots when both in range', () => {
    expect(slotsForSpread(0, 4, true)).toEqual([
      { page_index: 0, primary: true },
      { page_index: 1, primary: false }
    ])
  })

  test('two-page mode drops the secondary slot when out of range', () => {
    expect(slotsForSpread(1, 3, true)).toEqual([{ page_index: 2, primary: true }])
  })

  test('two-page mode returns no slots once the primary is out of range', () => {
    expect(slotsForSpread(2, 3, true)).toEqual([])
  })
})
