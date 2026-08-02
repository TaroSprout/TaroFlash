import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import CardCover from '@/components/card/card-cover.vue'

const revealFaceImageMock = vi.fn()
vi.mock('@/utils/animations/face-image', () => ({
  revealFaceImage: (...args) => revealFaceImageMock(...args)
}))

// A real 1x1 PNG so HTMLImageElement.decode() resolves genuinely in Chromium —
// no network fetch needed, so it stays deterministic and fast.
const DECODABLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

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

describe('CardCover — image cover [obligation]', () => {
  // A custom cover image fills the cover on its own — the palette/pattern/icon
  // chrome must never show behind it, not even before the image has decoded.

  test('renders card-cover__image when cover.image_path is set [obligation]', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png' })
    const img = wrapper.find('[data-testid="card-cover__image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn/cover.png')
  })

  test('does not render card-cover__icon when an image is set, even if an icon is also configured [obligation]', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png', icon: 'star' })
    expect(wrapper.find('[data-testid="card-cover__icon"]').exists()).toBe(false)
  })

  test('does not emit data-palette when an image is set, even if a palette is also configured [obligation]', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png', palette: 'green' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-palette')).toBeUndefined()
  })

  test('shows the shared skeleton pattern while loading, not the deck cover pattern [obligation]', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png', pattern: 'wave' })
    const el = wrapper.find('[data-testid="card-cover"]')
    expect(el.classes()).toContain('pattern-mask')
    expect(el.attributes('style')).toContain('--bgx-image: var(--bgx-diagonal-stripes)')
  })

  test('does not point --bgx-image at the deck cover pattern while loading [obligation]', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png', pattern: 'wave' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('style')).not.toContain(
      'var(--bgx-wave)'
    )
  })

  test('renders card-cover__icon (not the image) when no image_path is set', () => {
    const wrapper = mountCover({ icon: 'star' })
    expect(wrapper.find('[data-testid="card-cover__image"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-cover__icon"]').exists()).toBe(true)
  })

  // ── shimmer-until-decode [obligation] ────────────────────────────────────
  // jsdom has no real HTMLImageElement.decode (and this suite runs in a real
  // browser where decode() rejects for an unreachable test URL) — assert the
  // deterministic initial loading state, not the post-decode reveal, and
  // don't assert the gsap reveal animation itself.

  test('sets data-loading on mount while the image has not decoded yet [obligation]', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeDefined()
  })

  test('does not set data-loading when there is no image to decode', () => {
    const wrapper = mountCover({ icon: 'star' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeUndefined()
  })
})

describe('CardCover — decode resolves [obligation]', () => {
  // Same decoded gate as above, exercised with a real decodable image so
  // el.decode() actually resolves instead of rejecting — covers the reveal
  // side of the shimmer/decoded toggle (data-loading clears; opacity classes
  // are driven by the same `decoded` ref, not asserted directly here per the
  // no-class-assertions rule) and confirms revealFaceImage fires.

  beforeEach(() => {
    revealFaceImageMock.mockReset()
  })

  test('clears data-loading once the image finishes decoding [obligation]', async () => {
    const wrapper = mountCover({ image_path: DECODABLE_IMAGE })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeDefined()

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeUndefined()
    })
  })

  test('fires revealFaceImage on the decoded img element once decoding resolves [obligation]', async () => {
    mountCover({ image_path: DECODABLE_IMAGE })

    await vi.waitFor(() => {
      expect(revealFaceImageMock).toHaveBeenCalledTimes(1)
    })
    expect(revealFaceImageMock.mock.calls[0][0]).toBeInstanceOf(HTMLImageElement)
  })

  test('drops the deck cover pattern-mask and data-palette once decoding resolves, even with both configured [obligation]', async () => {
    const wrapper = mountCover({ image_path: DECODABLE_IMAGE, pattern: 'wave', palette: 'green' })

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeUndefined()
    })

    const el = wrapper.find('[data-testid="card-cover"]')
    expect(el.classes()).not.toContain('pattern-mask')
    expect(el.attributes('data-palette')).toBeUndefined()
  })
})
