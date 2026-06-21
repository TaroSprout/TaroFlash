import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import PinnedPreview from '@/components/deck/pinned-preview.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Stub for DeckDesignPreview — captures props and can emit update:side.
const DeckDesignPreviewStub = defineComponent({
  name: 'DeckDesignPreview',
  props: ['front_text', 'back_text', 'cover', 'card_attributes', 'side'],
  emits: ['update:side'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'deck-pinned-preview__preview',
        'data-side': props.side,
        'data-front-text': props.front_text ?? '',
        'data-back-text': props.back_text ?? '',
        onClick: () => emit('update:side', 'back')
      })
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseProps = {
  cover: { theme: 'blue-500', theme_dark: 'blue-800', pattern: 'none' },
  card_attributes: { front: {}, back: {} },
  side: 'cover'
}

// ── Factory ───────────────────────────────────────────────────────────────────

function makeWrapper(props = {}) {
  return shallowMount(PinnedPreview, {
    props: { ...baseProps, ...props },
    global: {
      stubs: {
        DeckDesignPreview: DeckDesignPreviewStub,
        Card: true,
        UiIcon: true
      }
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('PinnedPreview — rendering', () => {
  test('renders the root container', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="deck-pinned-preview"]').exists()).toBe(true)
  })

  test('renders the shadow card', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="deck-pinned-preview__shadow-card"]').exists()).toBe(true)
  })

  test('renders the paperclip decoration', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="deck-pinned-preview__paperclip"]').exists()).toBe(true)
  })

  test('renders the deck-design-preview', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="deck-pinned-preview__preview"]').exists()).toBe(true)
  })
})

// ── Props forwarded to DeckDesignPreview ─────────────────────────────────────

describe('PinnedPreview — props forwarding', () => {
  test('forwards the side prop to DeckDesignPreview', () => {
    const wrapper = makeWrapper({ side: 'back' })
    expect(
      wrapper.find('[data-testid="deck-pinned-preview__preview"]').attributes('data-side')
    ).toBe('back')
  })

  test('forwards front_text to DeckDesignPreview when provided', () => {
    const wrapper = makeWrapper({ front_text: 'Hello front' })
    expect(
      wrapper.find('[data-testid="deck-pinned-preview__preview"]').attributes('data-front-text')
    ).toBe('Hello front')
  })

  test('forwards back_text to DeckDesignPreview when provided', () => {
    const wrapper = makeWrapper({ back_text: 'Hello back' })
    expect(
      wrapper.find('[data-testid="deck-pinned-preview__preview"]').attributes('data-back-text')
    ).toBe('Hello back')
  })

  test('forwards empty strings when front_text/back_text not provided', () => {
    const wrapper = makeWrapper()
    expect(
      wrapper.find('[data-testid="deck-pinned-preview__preview"]').attributes('data-front-text')
    ).toBe('')
    expect(
      wrapper.find('[data-testid="deck-pinned-preview__preview"]').attributes('data-back-text')
    ).toBe('')
  })
})

// ── update:side forwarding [obligation] ───────────────────────────────────────

describe('PinnedPreview — update:side emit [obligation]', () => {
  test('forwards update:side emit from DeckDesignPreview to parent', async () => {
    const wrapper = makeWrapper({ side: 'cover' })

    // Simulate DeckDesignPreview emitting update:side
    await wrapper.find('[data-testid="deck-pinned-preview__preview"]').trigger('click')

    expect(wrapper.emitted('update:side')).toBeTruthy()
    expect(wrapper.emitted('update:side')[0]).toEqual(['back'])
  })
})
