import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, mount } from '@vue/test-utils'
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

// AvatarImage stub
const AvatarImageStub = defineComponent({
  name: 'AvatarImage',
  props: { avatar: { type: String, default: undefined } },
  setup(props) {
    return () => h('div', { 'data-testid': 'avatar-image-stub', 'data-avatar': props.avatar ?? '' })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: { editable: Boolean },
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: (e) => emit('press', e) }, slots.default?.())
  }
})

// UiTappable passthrough — renders slot content with forwarded attrs so
// data-testid attributes inside the badge template remain queryable.
const UiTappableStub = defineComponent({
  name: 'UiTappable',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    return () => h('div', attrs, slots.default?.())
  }
})

function mountBadge(props = {}) {
  return shallowMount(MemberBadge, {
    props,
    global: {
      stubs: { AvatarImage: AvatarImageStub, UiTappable: UiTappableStub, UiButton: UiButtonStub },
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

  // ── name truncation title ──────────────────────────────────────────────────

  describe('name truncation title', () => {
    test('exposes the full displayName via the title attribute', () => {
      const wrapper = mountBadge({ displayName: 'An Extremely Long Member Display Name' })
      expect(wrapper.find('[data-testid="member-badge__name"]').attributes('title')).toBe(
        'An Extremely Long Member Display Name'
      )
    })

    test('omits the title attribute when displayName is absent', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__name"]').attributes('title')).toBeUndefined()
    })
  })

  // ── cover bindings ─────────────────────────────────────────────────────────

  describe('cover bindings via memberCoverBindings', () => {
    test('applies data-palette from cover config', () => {
      const wrapper = mountBadge({ cover: { palette: 'blue', pattern: 'wave' } })
      expect(wrapper.find('[data-testid="member-badge"]').attributes('data-palette')).toBe('blue')
    })

    test('applies pattern class from cover config', () => {
      const wrapper = mountBadge({ cover: { palette: 'blue', pattern: 'wave' } })
      expect(wrapper.find('[data-testid="member-badge"]').classes()).toContain('pattern-mask')
    })

    test('falls back to MEMBER_CARD_COVER_DEFAULTS palette when cover is omitted', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge"]').attributes('data-palette')).toBe(
        MEMBER_CARD_COVER_DEFAULTS.palette
      )
    })

    test('never has a border style (border: false enforced)', () => {
      const wrapper = mountBadge({ cover: { palette: 'red', pattern: 'saw' } })
      const style = wrapper.find('[data-testid="member-badge"]').attributes('style') ?? ''
      expect(style).not.toContain('border:')
    })
  })

  // ── click emission ─────────────────────────────────────────────────────────

  describe('click event', () => {
    test('emits click when the tappable fires tap', async () => {
      const wrapper = mountBadge()
      await wrapper.findComponent({ name: 'UiTappable' }).vm.$emit('tap', new MouseEvent('click'))
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  // ── avatar image ──────────────────────────────────────────────────────────

  describe('avatar image', () => {
    test('forwards cover.avatar to avatar-image', () => {
      const wrapper = mountBadge({ cover: { palette: 'blue', pattern: 'wave', avatar: 'panda' } })
      expect(wrapper.find('[data-testid="avatar-image-stub"]').attributes('data-avatar')).toBe(
        'panda'
      )
    })
  })

  // ── editable / edit-avatar [obligation] ──────────────────────────────────

  describe('editable [obligation]', () => {
    test('the edit-avatar button is absent when editable is unset', () => {
      const wrapper = mountBadge()
      expect(wrapper.find('[data-testid="member-badge__avatar-edit"]').exists()).toBe(false)
    })

    test('the edit-avatar button is absent when editable is explicitly false', () => {
      const wrapper = mountBadge({ editable: false })
      expect(wrapper.find('[data-testid="member-badge__avatar-edit"]').exists()).toBe(false)
    })

    test('the edit-avatar button renders when editable is true', () => {
      const wrapper = mountBadge({ editable: true })
      expect(wrapper.find('[data-testid="member-badge__avatar-edit"]').exists()).toBe(true)
    })

    test('clicking the edit-avatar button emits edit-avatar but not click', async () => {
      const wrapper = mountBadge({ editable: true })
      await wrapper.find('[data-testid="member-badge__avatar-edit"]').trigger('click')

      expect(wrapper.emitted('edit-avatar')).toHaveLength(1)
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    // Real UiTappable + UiButton so the native click actually bubbles through
    // the DOM — this is the only way to catch a regression in the
    // e.stopPropagation() guard onEditAvatar relies on.
    test('the click does not bubble to the badge tappable in a real DOM tree [obligation]', async () => {
      const wrapper = mount(MemberBadge, {
        props: { editable: true },
        global: { stubs: { AvatarImage: AvatarImageStub }, directives: { sfx: {} } }
      })

      await wrapper.find('[data-testid="member-badge__avatar-edit"]').trigger('click')

      expect(wrapper.emitted('edit-avatar')).toHaveLength(1)
      expect(wrapper.emitted('click')).toBeUndefined()
    })
  })
})
