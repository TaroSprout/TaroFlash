import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const UiTagStub = defineComponent({
  name: 'UiTag',
  setup(_p, { slots }) {
    return () => h('span', { 'data-testid': 'card-count' }, slots.default?.())
  }
})

import CardCount from '@/views/deck/mode-toolbar/card-count.vue'
import { cardEditorKey } from '@/composables/card/list-controller'

function makeEditor({ card_count = 0 } = {}) {
  return {
    card_count: ref(card_count)
  }
}

function mount(editor = makeEditor()) {
  return shallowMount(CardCount, {
    global: {
      stubs: { UiTag: UiTagStub },
      provide: { [cardEditorKey]: editor },
      mocks: { $t: (key, n) => (n === 1 ? `${n} Card` : `${n} Cards`) }
    }
  })
}

describe('mode-toolbar/card-count', () => {
  test('renders the card-count tag', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-count"]').exists()).toBe(true)
  })

  test('shows singular label for 1 card [obligation]', () => {
    const wrapper = mount(makeEditor({ card_count: 1 }))
    expect(wrapper.find('[data-testid="card-count"]').text()).toContain('1 Card')
  })

  test('shows plural label for 197 cards [obligation]', () => {
    const wrapper = mount(makeEditor({ card_count: 197 }))
    expect(wrapper.find('[data-testid="card-count"]').text()).toContain('197 Cards')
  })

  test('reads card_count from the injected card-editor controller, not list.all_cards.length [obligation]', () => {
    // The controller exposes `card_count` (server total), not a loaded-card list length.
    // Injecting a controller without any all_cards list confirms the component only
    // touches card_count.
    const editor = { card_count: ref(42) }
    const wrapper = mount(editor)
    expect(wrapper.find('[data-testid="card-count"]').text()).toContain('42')
  })

  test('updates when card_count changes reactively', async () => {
    const editor = makeEditor({ card_count: 5 })
    const wrapper = mount(editor)
    expect(wrapper.find('[data-testid="card-count"]').text()).toContain('5 Cards')

    editor.card_count.value = 1
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="card-count"]').text()).toContain('1 Card')
  })
})
