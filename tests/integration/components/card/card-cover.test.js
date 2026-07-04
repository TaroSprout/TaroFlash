import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import CardCover from '@/components/card/card-cover.vue'

function mountCover(cover) {
  return shallowMount(CardCover, { props: { cover } })
}

describe('CardCover', () => {
  test('renders the cover element', () => {
    const wrapper = mountCover()
    expect(wrapper.find('[data-testid="card-cover"]').exists()).toBe(true)
  })

  test('falls back to purple-500 data-theme when no cover config', () => {
    const wrapper = mountCover()
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-theme')).toBe('purple-500')
  })

  test('sets data-theme from theme', () => {
    const wrapper = mountCover({ theme: 'green-400' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-theme')).toBe('green-400')
  })

  test('does not apply an inline border style — border is a static CSS rule now', () => {
    const wrapper = mountCover({ theme: 'blue-500' })
    const style = wrapper.find('[data-testid="card-cover"]').attributes('style')
    expect(style ?? '').not.toContain('border')
  })

  test.each([
    ['diagonal-stripes', 'var(--bgx-diagonal-stripes)'],
    ['wave', 'var(--bgx-wave)'],
    ['saw', 'var(--bgx-saw)'],
    ['bank-note', 'var(--bgx-bank-note)'],
    ['aztec', 'var(--bgx-aztec)'],
    ['endless-clouds', 'var(--bgx-endless-clouds)']
  ])('pattern "%s" applies pattern-mask and points --bgx-image at %s', (pattern, expectedImage) => {
    const wrapper = mountCover({ pattern })
    const el = wrapper.find('[data-testid="card-cover"]')
    expect(el.classes()).toContain('pattern-mask')
    expect(el.attributes('style')).toContain(`--bgx-image: ${expectedImage}`)
  })

  test('applies no pattern class when pattern is unset', () => {
    const wrapper = mountCover({ theme: 'blue-500' })
    const classes = wrapper.find('[data-testid="card-cover"]').classes()
    expect(classes).not.toContain('pattern-mask')
  })
})
