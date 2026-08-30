import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const PinnedPreviewStub = defineComponent({
  name: 'PinnedPreview',
  props: ['cover', 'card_attributes', 'side', 'hover_lift'],
  emits: ['update:side'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'pinned-preview', 'data-side': props.side }, [
        h(
          'button',
          {
            'data-testid': 'pinned-preview__flip',
            onClick: () => emit('update:side', props.side === 'cover' ? 'front' : 'cover')
          },
          'Flip'
        )
      ])
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SplashPreview from '@/views/welcome/splash/splash-preview.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountSplashPreview() {
  return shallowMount(SplashPreview, {
    global: {
      stubs: {
        PinnedPreview: PinnedPreviewStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SplashPreview', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the preview container', () => {
    const wrapper = mountSplashPreview()
    expect(wrapper.find('[data-testid="welcome-hero__preview"]').exists()).toBe(true)
  })

  test('renders the PinnedPreview component', () => {
    const wrapper = mountSplashPreview()
    expect(wrapper.find('[data-testid="pinned-preview"]').exists()).toBe(true)
  })

  test('preview starts on the cover side', () => {
    const wrapper = mountSplashPreview()
    expect(wrapper.find('[data-testid="pinned-preview"]').attributes('data-side')).toBe('cover')
  })

  // [obligation] The splash preview never opts into the hover lift — only
  // deck-settings does — so it must stay static.
  test('never passes hover_lift to the pinned preview [obligation]', () => {
    const wrapper = mountSplashPreview()
    const preview = wrapper.findComponent({ name: 'PinnedPreview' })
    expect(preview.props('hover_lift')).toBeFalsy()
  })

  // ── flipPreviewSide [obligation] ───────────────────────────────────────────

  test('flipping the pinned preview side updates the side [obligation]', async () => {
    const wrapper = mountSplashPreview()
    await wrapper.find('[data-testid="pinned-preview__flip"]').trigger('click')
    expect(wrapper.find('[data-testid="pinned-preview"]').attributes('data-side')).toBe('front')
  })

  test('flipping the pinned preview emits nav.page-forward sfx [obligation]', async () => {
    const wrapper = mountSplashPreview()
    await wrapper.find('[data-testid="pinned-preview__flip"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('nav.page-forward')
  })

  test('flipping back to cover side updates the side', async () => {
    const wrapper = mountSplashPreview()
    // Flip to front
    await wrapper.find('[data-testid="pinned-preview__flip"]').trigger('click')
    // Flip back to cover
    await wrapper.find('[data-testid="pinned-preview__flip"]').trigger('click')
    expect(wrapper.find('[data-testid="pinned-preview"]').attributes('data-side')).toBe('cover')
  })

  test('each flip emits nav.page-forward sfx', async () => {
    const wrapper = mountSplashPreview()
    await wrapper.find('[data-testid="pinned-preview__flip"]').trigger('click')
    await wrapper.find('[data-testid="pinned-preview__flip"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledTimes(2)
    expect(mockEmitSfx).toHaveBeenNthCalledWith(1, 'nav.page-forward')
    expect(mockEmitSfx).toHaveBeenNthCalledWith(2, 'nav.page-forward')
  })
})
