import { describe, test, expect, vi } from 'vite-plus/test'

const mockUseMatchMedia = vi.fn()

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (...args) => mockUseMatchMedia(...args)
}))

import {
  isMobileFor,
  DEFAULT_MODE,
  DEFAULT_WIDTH_KEY,
  DEFAULT_HEIGHT_KEY
} from '@/components/ui-kit/modal/mobile-below'

describe('defaults', () => {
  test('DEFAULT_MODE is dialog', () => {
    expect(DEFAULT_MODE).toBe('dialog')
  })

  test('DEFAULT_WIDTH_KEY and DEFAULT_HEIGHT_KEY are sm', () => {
    expect(DEFAULT_WIDTH_KEY).toBe('sm')
    expect(DEFAULT_HEIGHT_KEY).toBe('sm')
  })
})

describe('isMobileFor', () => {
  test('falls back to the default width/height keys when the dataset attrs are absent', () => {
    mockUseMatchMedia.mockReturnValue({ value: true })
    const el = document.createElement('div')

    const result = isMobileFor(el)

    expect(mockUseMatchMedia).toHaveBeenCalledWith(
      `w<${DEFAULT_WIDTH_KEY} | h<${DEFAULT_HEIGHT_KEY}`
    )
    expect(result).toBe(true)
  })

  test('reads the width/height keys stamped on the dataset when present', () => {
    mockUseMatchMedia.mockReturnValue({ value: false })
    const el = document.createElement('div')
    el.dataset.mobileBelowWidth = 'lg'
    el.dataset.mobileBelowHeight = 'md'

    const result = isMobileFor(el)

    expect(mockUseMatchMedia).toHaveBeenCalledWith('w<lg | h<md')
    expect(result).toBe(false)
  })
})
