import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// Stub UiPopover so the test stays focused on the wrapper's open-gating + prop
// forwarding. The stub mirrors the real popover's open-gated rendering. A render
// function is used because the browser-mode build has no runtime template compiler.
const UiPopoverStub = {
  name: 'UiPopover',
  props: ['open'],
  setup(props, { slots }) {
    return () => (props.open ? h('div', slots.default?.()) : null)
  }
}

// Capture the props handed to TermCard so we can assert they're forwarded.
const TermCardStub = defineComponent({
  name: 'TermCard',
  props: ['term', 'sentence', 'target_lang'],
  emits: ['close'],
  setup() {
    return () => h('div', { 'data-testid': 'term-card-stub' })
  }
})

function mountPopover(props = {}) {
  return shallowMount(TermPopover, {
    props: {
      open: false,
      rect: null,
      term: '',
      sentence: '',
      target_lang: 'en',
      ...props
    },
    global: {
      stubs: { UiPopover: UiPopoverStub, TermCard: TermCardStub },
      mocks: { $t: (key) => key }
    }
  })
}

import TermPopover from '@/views/audio-reader/term-popover/index.vue'

describe('TermPopover', () => {
  test('does not render the card surface when open is false', () => {
    const wrapper = mountPopover({ open: false, term: '猫' })
    expect(wrapper.find('[data-testid="term-popover"]').exists()).toBe(false)
  })

  test('renders the card surface when open is true', () => {
    const wrapper = mountPopover({ open: true, term: '猫' })
    expect(wrapper.find('[data-testid="term-popover"]').exists()).toBe(true)
  })

  test('forwards term + sentence + target_lang to the card', () => {
    const wrapper = mountPopover({
      open: true,
      term: '猫',
      sentence: '猫がいる',
      target_lang: 'en'
    })

    const card = wrapper.findComponent(TermCardStub)
    expect(card.props()).toMatchObject({ term: '猫', sentence: '猫がいる', target_lang: 'en' })
  })

  test('re-emits close when the card requests it', () => {
    const wrapper = mountPopover({ open: true, term: '猫' })

    wrapper.findComponent(TermCardStub).vm.$emit('close')

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
