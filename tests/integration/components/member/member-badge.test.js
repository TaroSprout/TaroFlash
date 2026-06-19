import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// Hoist shared mock refs before vi.mock calls
const { coarseRef, mockEmitSfx } = vi.hoisted(() => ({
  coarseRef: { value: false },
  mockEmitSfx: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => coarseRef
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.())
  }
}))

import MemberBadge from '@/components/member/member-badge.vue'
import { MEMBER_CARD_COVER_DEFAULTS } from '@/utils/member/defaults'

// UiImage stub using a render function (browser mode — no template compiler)
const UiImageStub = defineComponent({
  name: 'UiImage',
  setup() {
    return () => h('div', { 'data-testid': 'ui-image-stub' })
  }
})

function mountBadge(props = {}) {
  return shallowMount(MemberBadge, {
    props,
    global: {
      stubs: { UiImage: UiImageStub },
      directives: { sfx: {} }
    }
  })
}

describe('MemberBadge', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  // ── data-testid structure ──────────────────────────────────────────────────

  describe('data-testid attributes', () => {
    test('renders member-badge root element [obligation]', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge"]').exists()).toBe(true)
    })

    test('renders member-badge__avatar element [obligation]', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__avatar"]').exists()).toBe(true)
    })

    test('renders member-badge__info element [obligation]', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__info"]').exists()).toBe(true)
    })

    test('renders member-badge__name element [obligation]', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__name"]').exists()).toBe(true)
    })

    test('renders member-badge__description element [obligation]', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__description"]').exists()).toBe(true)
    })
  })

  // ── i18n fallbacks ─────────────────────────────────────────────────────────

  describe('i18n fallbacks when props are absent', () => {
    test('shows name-placeholder when displayName is absent [obligation]', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__name"]').text()).toBe('Member Name')
    })

    test('shows description-fallback when description is absent [obligation]', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__description"]').text()).toBe(
        'No description yet'
      )
    })
  })

  // ── prop rendering ─────────────────────────────────────────────────────────

  describe('prop rendering', () => {
    test('renders displayName when provided', () => {
      const wrapper = mountBadge({ displayName: 'Nina' })
      expect(wrapper.find('[data-testid="member-badge__name"]').text()).toBe('Nina')
    })

    test('renders description when provided', () => {
      const wrapper = mountBadge({ description: 'Card collector' })
      expect(wrapper.find('[data-testid="member-badge__description"]').text()).toBe(
        'Card collector'
      )
    })
  })

  // ── cover bindings ─────────────────────────────────────────────────────────

  describe('cover bindings via memberCoverBindings', () => {
    test('applies data-theme from cover config', () => {
      const wrapper = mountBadge({ cover: { theme: 'blue-700', pattern: 'wave' } })
      expect(wrapper.find('[data-testid="member-badge"]').attributes('data-theme')).toBe('blue-700')
    })

    test('applies pattern class from cover config', () => {
      const wrapper = mountBadge({ cover: { theme: 'blue-700', pattern: 'wave' } })
      expect(wrapper.find('[data-testid="member-badge"]').classes()).toContain('bgx-wave')
    })

    test('falls back to MEMBER_CARD_COVER_DEFAULTS theme when cover is omitted', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge"]').attributes('data-theme')).toBe(
        MEMBER_CARD_COVER_DEFAULTS.theme
      )
    })

    test('never has a border style (border: false enforced)', () => {
      const wrapper = mountBadge({ cover: { theme: 'red-500', pattern: 'saw' } })
      const style = wrapper.find('[data-testid="member-badge"]').attributes('style') ?? ''
      expect(style).not.toContain('border:')
    })
  })

  // ── click handler ──────────────────────────────────────────────────────────

  describe('onCaptureClick', () => {
    test('does not throw when clicked with no onClick attr (early-return branch)', async () => {
      const wrapper = mountBadge()
      await expect(
        wrapper.find('[data-testid="member-badge"]').trigger('click')
      ).resolves.not.toThrow()
    })

    test('does not throw when clicked with an onClick attr (handler branch)', async () => {
      const handler = vi.fn()
      const wrapper = shallowMount(MemberBadge, {
        attrs: { onClick: handler },
        global: {
          stubs: { UiImage: UiImageStub },
          directives: { sfx: {} }
        }
      })
      await expect(
        wrapper.find('[data-testid="member-badge"]').trigger('click')
      ).resolves.not.toThrow()
    })
  })
})
