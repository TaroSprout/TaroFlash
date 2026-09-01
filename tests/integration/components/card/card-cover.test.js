import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import CardCover from '@/components/card/card-cover.vue'

const revealFaceImageMock = vi.fn()
vi.mock('@/utils/animations/face-image', () => ({
  revealFaceImage: (...args) => revealFaceImageMock(...args)
}))

// A real 1x1 PNG so HTMLImageElement.decode() resolves genuinely in Chromium —
// no network fetch needed, so it stays deterministic and fast.
const DECODABLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function mountCover(cover, cover_image) {
  return shallowMount(CardCover, { props: { cover, cover_image } })
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

describe('CardCover — icon palette', () => {
  // coverIconPalette() keeps the icon legible against its own fill — yellow
  // by default, purple on a yellow cover — independent of the cover's own
  // data-palette (or lack of one).

  test('colours the icon purple when the cover palette is yellow', () => {
    const wrapper = mountCover({ icon: 'star', palette: 'yellow' })
    expect(wrapper.find('[data-testid="card-cover__icon"]').attributes('data-palette')).toBe(
      'purple'
    )
  })

  test('colours the icon yellow for a non-yellow cover palette', () => {
    const wrapper = mountCover({ icon: 'star', palette: 'blue' })
    expect(wrapper.find('[data-testid="card-cover__icon"]').attributes('data-palette')).toBe(
      'yellow'
    )
  })

  test('keeps the icon coloured yellow on a palette-less (neutral) cover', () => {
    const wrapper = mountCover({ icon: 'star' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-palette')).toBeUndefined()
    expect(wrapper.find('[data-testid="card-cover__icon"]').attributes('data-palette')).toBe(
      'yellow'
    )
  })
})

describe('CardCover — image cover', () => {
  // A custom cover image fills the cover on its own — the palette/pattern/icon
  // chrome must never show behind it, not even before the image has decoded.

  test('renders card-cover__image when cover.image_path is set', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png' })
    const img = wrapper.find('[data-testid="card-cover__image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn/cover.png')
  })

  test('does not render card-cover__icon when an image is set, even if an icon is also configured', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png', icon: 'star' })
    expect(wrapper.find('[data-testid="card-cover__icon"]').exists()).toBe(false)
  })

  test('does not emit data-palette when an image is set, even if a palette is also configured', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png', palette: 'green' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-palette')).toBeUndefined()
  })

  test('shows the shared skeleton pattern while loading, not the deck cover pattern', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png', pattern: 'wave' })
    const el = wrapper.find('[data-testid="card-cover"]')
    expect(el.classes()).toContain('pattern-mask')
    expect(el.attributes('style')).toContain('--bgx-image: var(--bgx-diagonal-stripes)')
  })

  test('does not point --bgx-image at the deck cover pattern while loading', () => {
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

  // ── shimmer-until-decode ────────────────────────────────────
  // jsdom has no real HTMLImageElement.decode (and this suite runs in a real
  // browser where decode() rejects for an unreachable test URL) — assert the
  // deterministic initial loading state, not the post-decode reveal, and
  // don't assert the gsap reveal animation itself.

  test('sets data-loading on mount while the image has not decoded yet', () => {
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeDefined()
  })

  test('does not set data-loading when there is no image to decode', () => {
    const wrapper = mountCover({ icon: 'star' })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeUndefined()
  })

  // ── shimmer bleed ────────────────────────────────────────────
  // The sweep's ::after defaults to the padding box (--shimmer-bleed: 0px in
  // shimmer.css); the cover overrides it to its own border width so the sweep
  // crosses the border instead of stopping short of it.

  test('sets --shimmer-bleed to the resolved cover border width while loading', () => {
    // --face-border-width isn't defined by any station stylesheet in this
    // isolated mount, so give it a concrete value on the attach point and
    // confirm --shimmer-bleed tracks it — proves the property is wired to
    // the border width, not left at the shimmer utility's own 0px default.
    const container = document.createElement('div')
    container.style.setProperty('--face-border-width', '3px')
    document.body.appendChild(container)

    const wrapper = shallowMount(CardCover, {
      props: { cover: { image_path: 'https://cdn/cover.png' } },
      attachTo: container
    })
    const cover = wrapper.find('[data-testid="card-cover"]')
    expect(cover.attributes('data-loading')).toBe('true')
    expect(cover.classes()).toContain('shimmer')
    expect(getComputedStyle(cover.element).getPropertyValue('--shimmer-bleed').trim()).toBe('3px')

    wrapper.unmount()
    container.remove()
  })
})

describe('CardCover — decode resolves', () => {
  // Same decoded gate as above, exercised with a real decodable image so
  // el.decode() actually resolves instead of rejecting — covers the reveal
  // side of the shimmer/decoded toggle (data-loading clears; opacity classes
  // are driven by the same `decoded` ref, not asserted directly here per the
  // no-class-assertions rule) and confirms revealFaceImage fires.

  beforeEach(() => {
    revealFaceImageMock.mockReset()
  })

  test('clears data-loading once the image finishes decoding', async () => {
    const wrapper = mountCover({ image_path: DECODABLE_IMAGE })
    expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeDefined()

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeUndefined()
    })
  })

  test('fires revealFaceImage on the decoded img element once decoding resolves', async () => {
    mountCover({ image_path: DECODABLE_IMAGE })

    await vi.waitFor(() => {
      expect(revealFaceImageMock).toHaveBeenCalledTimes(1)
    })
    expect(revealFaceImageMock.mock.calls[0][0]).toBeInstanceOf(HTMLImageElement)
  })

  test('drops the deck cover pattern-mask and data-palette once decoding resolves, even with both configured', async () => {
    const wrapper = mountCover({ image_path: DECODABLE_IMAGE, pattern: 'wave', palette: 'green' })

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="card-cover"]').attributes('data-loading')).toBeUndefined()
    })

    const el = wrapper.find('[data-testid="card-cover"]')
    expect(el.classes()).not.toContain('pattern-mask')
    expect(el.attributes('data-palette')).toBeUndefined()
  })
})

describe('CardCover — cover_image ref wiring', () => {
  // setImgEl feeds the rendered <img> into both useImageReveal's own img_el
  // (already covered by the "decode resolves" suite above) and, when a
  // cover_image staging interface is passed in, its image_el handle — the
  // hook useCoverImage's onRemove uses to collapse the image before clearing it.

  test('feeds the rendered <img> element into cover_image.image_el', () => {
    const cover_image = { image_el: shallowRef(null) }
    const wrapper = mountCover({ image_path: 'https://cdn/cover.png' }, cover_image)

    const img = wrapper.find('[data-testid="card-cover__image"]')
    expect(cover_image.image_el.value).toBe(img.element)
  })

  test('tolerates cover_image being absent — most call sites do not pass it', () => {
    expect(() => mountCover({ image_path: 'https://cdn/cover.png' })).not.toThrow()
  })
})
