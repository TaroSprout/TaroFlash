import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, shallowRef } from 'vue'
import { welcomeWidthKey } from '@/views/welcome/welcome-layout'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'feature-card__icon', 'data-src': props.src })
  }
})

const CardStub = defineComponent({
  name: 'Card',
  props: ['size', 'side', 'cover_config'],
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'card-stub',
          'data-size': props.size,
          'data-side': props.side,
          'data-cover-pattern': props.cover_config?.pattern
        },
        slots.front?.()
      )
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import FeatureCard from '@/views/welcome/section-features/feature-card.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

// width is provided via injection so useWelcomeWidth() resolves; default desktop.
const width = shallowRef('desktop')

function mountFeatureCard(props = {}) {
  return shallowMount(FeatureCard, {
    props: {
      feature_key: 'experience',
      icon: 'paint-brush',
      accent: 'var(--color-purple-500)',
      accent_dark: 'var(--color-purple-700)',
      ...props
    },
    global: {
      provide: { [welcomeWidthKey]: width },
      stubs: {
        UiIcon: UiIconStub,
        Card: CardStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FeatureCard', () => {
  beforeEach(() => {
    width.value = 'desktop'
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the card face element [obligation]', () => {
    const wrapper = mountFeatureCard()
    expect(wrapper.find('[data-testid="feature-card__face"]').exists()).toBe(true)
  })

  test('renders the icon element [obligation]', () => {
    const wrapper = mountFeatureCard()
    expect(wrapper.find('[data-testid="feature-card__icon"]').exists()).toBe(true)
  })

  // ── i18n key resolution ────────────────────────────────────────────────────

  test('renders heading text resolved from feature_key i18n key [obligation]', () => {
    const wrapper = mountFeatureCard({ feature_key: 'experience' })
    const face = wrapper.find('[data-testid="feature-card__face"]')
    expect(face.text()).toContain('Fully Customizable')
  })

  test('renders description text resolved from feature_key i18n key [obligation]', () => {
    const wrapper = mountFeatureCard({ feature_key: 'experience' })
    const face = wrapper.find('[data-testid="feature-card__face"]')
    expect(face.text()).toContain('Pick how your decks and cards look')
  })

  test('renders mobile card heading from i18n key', () => {
    const wrapper = mountFeatureCard({
      feature_key: 'mobile',
      icon: 'mobile-phone',
      accent: 'var(--color-blue-500)',
      accent_dark: 'var(--color-blue-650)'
    })
    const face = wrapper.find('[data-testid="feature-card__face"]')
    expect(face.text()).toContain('Made For Mobile')
  })

  test('renders scheduling card heading from i18n key', () => {
    const wrapper = mountFeatureCard({
      feature_key: 'scheduling',
      icon: 'clock',
      accent: 'var(--color-pink-500)',
      accent_dark: 'var(--color-pink-700)'
    })
    const face = wrapper.find('[data-testid="feature-card__face"]')
    expect(face.text()).toContain('Spaced Repetition')
  })

  test('renders upcoming card heading from i18n key', () => {
    const wrapper = mountFeatureCard({
      feature_key: 'upcoming',
      icon: 'shooting-star',
      accent: 'var(--color-yellow-500)',
      accent_dark: 'var(--color-yellow-700)'
    })
    const face = wrapper.find('[data-testid="feature-card__face"]')
    expect(face.text()).toContain('More On The Way')
  })

  // ── Icon prop ──────────────────────────────────────────────────────────────

  test('passes icon prop to the icon component', () => {
    const wrapper = mountFeatureCard({ icon: 'paint-brush' })
    const icon = wrapper.find('[data-testid="feature-card__icon"]')
    expect(icon.attributes('data-src')).toBe('paint-brush')
  })

  // ── side / cover forwarding ──────────────────────────────────────────────────

  test('defaults the card side to "front" when side prop is omitted [obligation]', () => {
    const wrapper = mountFeatureCard()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')
  })

  test('forwards the side prop to the card [obligation]', () => {
    const wrapper = mountFeatureCard({ side: 'cover' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('cover')
  })

  test('forwards the cover config to the card as cover_config [obligation]', () => {
    const wrapper = mountFeatureCard({
      cover: { theme: 'purple-500', pattern: 'diagonal-stripes' }
    })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-cover-pattern')).toBe(
      'diagonal-stripes'
    )
  })

  // ── size derived from useWelcomeWidth() [obligation] ────────────────────────

  test('passes size="lg" to the card on desktop [obligation]', () => {
    width.value = 'desktop'
    const wrapper = mountFeatureCard()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-size')).toBe('lg')
  })

  test('passes size="xl" to the card on tablet [obligation]', () => {
    width.value = 'tablet'
    const wrapper = mountFeatureCard()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-size')).toBe('xl')
  })

  test('passes size="sm" to the card on mobile [obligation]', () => {
    width.value = 'mobile'
    const wrapper = mountFeatureCard()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-size')).toBe('sm')
  })

  // The face's data-size-tier mirrors the same `size` value that drives the
  // icon/heading/description lookup maps (FACE_ROWS/ICON_SIZE/HEADING_SIZE/
  // DESCRIPTION_SIZE) — asserting the attribute proves each width tier picks a
  // distinct entry without asserting Tailwind class names directly.
  test('face data-size-tier tracks the width-derived size on desktop [obligation]', () => {
    width.value = 'desktop'
    const face = mountFeatureCard().find('[data-testid="feature-card__face"]')
    expect(face.attributes('data-size-tier')).toBe('lg')
  })

  test('face data-size-tier tracks the width-derived size on tablet [obligation]', () => {
    width.value = 'tablet'
    const face = mountFeatureCard().find('[data-testid="feature-card__face"]')
    expect(face.attributes('data-size-tier')).toBe('xl')
  })

  test('face data-size-tier tracks the width-derived size on mobile [obligation]', () => {
    width.value = 'mobile'
    const face = mountFeatureCard().find('[data-testid="feature-card__face"]')
    expect(face.attributes('data-size-tier')).toBe('sm')
  })
})
