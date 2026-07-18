import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiPinnedCard from '@/components/ui-kit/pinned-card.vue'

function makeWrapper(props = {}, slots = {}) {
  return mount(UiPinnedCard, {
    props,
    slots,
    global: { stubs: { UiIcon: true } }
  })
}

describe('UiPinnedCard — structure', () => {
  test('renders the root container', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card"]').exists()).toBe(true)
  })

  test('renders the card slot wrapper', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card__card"]').exists()).toBe(true)
  })

  test('renders the paperclip decoration', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card__paperclip"]').exists()).toBe(true)
  })
})

describe('UiPinnedCard — slots', () => {
  test('renders the backdrop slot ahead of the card slot in document order', () => {
    const wrapper = makeWrapper(
      {},
      {
        backdrop: '<div data-testid="backdrop-content">back</div>',
        default: '<div data-testid="card-content">front</div>'
      }
    )

    const backdrop = wrapper.find('[data-testid="backdrop-content"]').element
    const card = wrapper.find('[data-testid="card-content"]').element
    expect(!!(backdrop.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  test('renders default slot content inside the card wrapper', () => {
    const wrapper = makeWrapper({}, { default: '<div data-testid="card-content">front</div>' })
    const card_wrapper = wrapper.find('[data-testid="ui-pinned-card__card"]')
    expect(card_wrapper.find('[data-testid="card-content"]').exists()).toBe(true)
  })

  test('renders with no backdrop slot content when omitted', () => {
    const wrapper = makeWrapper({}, { default: '<div>front</div>' })
    expect(wrapper.find('[data-testid="ui-pinned-card"]').element.children.length).toBeGreaterThan(
      0
    )
  })
})

// ── tucked prop [obligation] ────────────────────────────────────────────────────

describe('UiPinnedCard — tucked prop reflected on the paperclip [obligation]', () => {
  test('defaults tucked to false', () => {
    const wrapper = makeWrapper()
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('false')
  })

  test('reflects tucked=true on the paperclip data-tucked attribute', () => {
    const wrapper = makeWrapper({ tucked: true })
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('true')
  })

  test('reflects tucked=false explicitly', () => {
    const wrapper = makeWrapper({ tucked: false })
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('false')
  })

  test('updates data-tucked reactively when the prop changes', async () => {
    const wrapper = makeWrapper({ tucked: false })
    await wrapper.setProps({ tucked: true })
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('true')
  })
})
