// The hover_lift forwarding assertions read real computed styles, so the app's
// stylesheet has to be present — without it every Tailwind utility resolves to
// nothing and they pass vacuously.
import '@/styles/main.css'

import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import PinnedPreview from '@/components/deck/pinned-preview.vue'

// ui-pinned-card renders v-sfx when hover_lift is on; register the real
// directive over a mocked bus so mounting doesn't warn or play sound.
vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))

import { vSfx } from '@/sfx/directive'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Stub for DeckDesignPreview — captures props and can emit update:side.
const DeckDesignPreviewStub = defineComponent({
  name: 'DeckDesignPreview',
  props: [
    'front_text',
    'back_text',
    'cover',
    'card_attributes',
    'side',
    'cover_editing',
    'cover_image'
  ],
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
  return mount(PinnedPreview, {
    props: { ...baseProps, ...props },
    global: {
      stubs: {
        DeckDesignPreview: DeckDesignPreviewStub,
        Card: true,
        UiIcon: true
      },
      directives: { sfx: vSfx }
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

  test('renders the paperclip decoration (owned by ui-pinned-card, forwarded through)', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card__paperclip"]').exists()).toBe(true)
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

// ── update:side forwarding ───────────────────────────────────────

describe('PinnedPreview — update:side emit', () => {
  test('forwards update:side emit from DeckDesignPreview to parent', async () => {
    const wrapper = makeWrapper({ side: 'cover' })

    // Simulate DeckDesignPreview emitting update:side
    await wrapper.find('[data-testid="deck-pinned-preview__preview"]').trigger('click')

    expect(wrapper.emitted('update:side')).toBeTruthy()
    expect(wrapper.emitted('update:side')[0]).toEqual(['back'])
  })
})

// ── tucked prop forwarding ─────────────────────────────────────────
// The DOM contract moved from an ancestor's `group-data-[tucked=true]` selector
// to an explicit `tucked` prop on ui-pinned-card — assert PinnedPreview forwards
// it through, and that the paperclip reflects it via data-tucked.

describe('PinnedPreview — forwards tucked through to ui-pinned-card', () => {
  test('defaults the paperclip data-tucked to false when the prop is omitted', () => {
    const wrapper = makeWrapper()
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('false')
  })

  test('forwards tucked=true so the paperclip data-tucked reflects it', () => {
    const wrapper = makeWrapper({ tucked: true })
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('true')
  })
})

// ── cover_editing / cover_image pass-through ────────────────────────────────

describe('PinnedPreview — cover_editing / cover_image pass-through', () => {
  test('forwards cover_editing to DeckDesignPreview', () => {
    const wrapper = makeWrapper({ cover_editing: true })
    const preview = wrapper.findComponent({ name: 'DeckDesignPreview' })
    expect(preview.props('cover_editing')).toBe(true)
  })

  test('forwards cover_image to DeckDesignPreview', () => {
    const cover_image = { has_image: { value: false } }
    const wrapper = makeWrapper({ cover_image })
    const preview = wrapper.findComponent({ name: 'DeckDesignPreview' })
    // Props cross the browser-mode component boundary serialized, so identity
    // doesn't survive — compare structurally instead.
    expect(preview.props('cover_image')).toEqual(cover_image)
  })
})

// ── hover_lift prop forwarding ─────────────────────────────────────
// ui-pinned-card is real (not stubbed) here, so the forwarded prop shows up as
// real rendered behaviour on the nested swing element: a hover transition and a
// pivot moved off the element's own centre. ui-pinned-card's own suite owns the
// swing's geometry and timing — all this needs to prove is that the prop
// arrives.

describe('PinnedPreview — forwards hover_lift through to ui-pinned-card', () => {
  const swingStyle = (wrapper) => {
    const host = document.createElement('div')
    host.style.width = '400px'
    document.body.appendChild(host)
    host.appendChild(wrapper.element)

    const swing = wrapper.find('[data-testid="ui-pinned-card__swing"]').element
    const style = {
      duration: getComputedStyle(swing).transitionDuration,
      origin: getComputedStyle(swing).transformOrigin,
      centre: `${swing.offsetWidth / 2}px ${swing.offsetHeight / 2}px`
    }

    host.remove()
    return style
  }

  test('omitting hover_lift leaves the swing with no transition and its default pivot', () => {
    const { duration, origin, centre } = swingStyle(makeWrapper())
    expect(duration).toBe('0s')
    expect(origin).toBe(centre)
  })

  test('hover_lift: true forwards through, arming the swing transition and pivot', () => {
    const { duration, origin, centre } = swingStyle(makeWrapper({ hover_lift: true }))
    expect(parseFloat(duration)).toBeGreaterThan(0)
    expect(origin).not.toBe(centre)
  })
})
