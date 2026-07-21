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

  test('omits data-palette when no cover config — CSS falls back to the neutral element role', () => {
    const wrapper = mountCover()
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-palette')).toBeUndefined()
  })

  test('sets data-palette from palette', () => {
    const wrapper = mountCover({ palette: 'green' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-palette')).toBe('green')
  })

  test('does not apply an inline border style — border is a static CSS rule now', () => {
    const wrapper = mountCover({ palette: 'blue' })
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
    const wrapper = mountCover({ palette: 'blue' })
    const classes = wrapper.find('[data-testid="card-cover"]').classes()
    expect(classes).not.toContain('pattern-mask')
  })
})
