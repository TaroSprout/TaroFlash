import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import CheckoutFooter from '@/components/modals/checkout/checkout-footer.vue'

function mountFooter(props) {
  return shallowMount(CheckoutFooter, { props })
}

describe('CheckoutFooter — loading', () => {
  test('[obligation] loading is true while status is loading', () => {
    const wrapper = mountFooter({ status: 'loading', is_ready: true })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('loading')).toBe(true)
  })

  test('[obligation] loading is true while status is confirming', () => {
    const wrapper = mountFooter({ status: 'confirming', is_ready: true })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('loading')).toBe(true)
  })

  test('loading is false while status is form', () => {
    const wrapper = mountFooter({ status: 'form', is_ready: true })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('loading')).toBe(false)
  })
})

describe('CheckoutFooter — disabled', () => {
  test('[obligation] disabled when is_ready is false', () => {
    const wrapper = mountFooter({ status: 'form', is_ready: false })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('disabled')).toBe(true)
  })

  test('[obligation] disabled when status is error', () => {
    const wrapper = mountFooter({ status: 'error', is_ready: true })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('disabled')).toBe(true)
  })

  test('enabled when ready and not errored', () => {
    const wrapper = mountFooter({ status: 'form', is_ready: true })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('disabled')).toBe(false)
  })
})

describe('CheckoutFooter — submit', () => {
  test('emits submit when pressed', () => {
    const wrapper = mountFooter({ status: 'form', is_ready: true })
    wrapper.findComponent({ name: 'UiButton' }).vm.$emit('press')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  test('renders the submit label text', () => {
    const wrapper = shallowMount(CheckoutFooter, {
      props: { status: 'form', is_ready: true },
      global: { renderStubDefaultSlot: true }
    })
    expect(wrapper.text()).toContain('Subscribe')
  })
})
