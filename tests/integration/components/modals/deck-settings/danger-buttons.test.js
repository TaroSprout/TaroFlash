import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import DangerResetButton from '@/components/modals/deck-settings/danger-reset-button.vue'
import DangerDeleteButton from '@/components/modals/deck-settings/danger-delete-button.vue'
import { deckDangerActionsKey } from '@/composables/deck/danger-actions'

const ButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: { type: Boolean, default: false } },
  emits: ['click'],
  inheritAttrs: false,
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          type: 'button',
          ...attrs,
          'data-loading': String(!!props.loading),
          disabled: props.loading,
          onClick: (e) => emit('click', e)
        },
        slots.default?.()
      )
  }
})

function mountWith(component, opts = {}) {
  const onDelete = vi.fn()
  const onResetReviews = vi.fn()
  const deleting = ref(opts.deleting ?? false)
  const resetting_reviews = ref(opts.resetting_reviews ?? false)
  const danger = { onDelete, onResetReviews, deleting, resetting_reviews }
  const wrapper = mount(component, {
    global: {
      provide: { [deckDangerActionsKey]: danger },
      stubs: { UiButton: ButtonStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, onDelete, onResetReviews, deleting, resetting_reviews }
}

describe('DangerResetButton', () => {
  test('renders with the shared testid', () => {
    const { wrapper } = mountWith(DangerResetButton)
    expect(wrapper.find('[data-testid="danger-reset-button"]').exists()).toBe(true)
  })

  test('invokes injected onResetReviews on click', async () => {
    const { wrapper, onResetReviews } = mountWith(DangerResetButton)
    await wrapper.find('[data-testid="danger-reset-button"]').trigger('click')
    expect(onResetReviews).toHaveBeenCalledTimes(1)
  })

  test('reflects the injected resetting_reviews loading state', async () => {
    const { wrapper, resetting_reviews } = mountWith(DangerResetButton)
    const btn = wrapper.find('[data-testid="danger-reset-button"]')
    expect(btn.attributes('data-loading')).toBe('false')
    resetting_reviews.value = true
    await wrapper.vm.$nextTick()
    expect(btn.attributes('data-loading')).toBe('true')
  })
})

describe('DangerDeleteButton', () => {
  test('renders with the shared testid', () => {
    const { wrapper } = mountWith(DangerDeleteButton)
    expect(wrapper.find('[data-testid="danger-delete-button"]').exists()).toBe(true)
  })

  test('invokes injected onDelete on click', async () => {
    const { wrapper, onDelete } = mountWith(DangerDeleteButton)
    await wrapper.find('[data-testid="danger-delete-button"]').trigger('click')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('reflects the injected deleting loading state', async () => {
    const { wrapper, deleting } = mountWith(DangerDeleteButton)
    const btn = wrapper.find('[data-testid="danger-delete-button"]')
    expect(btn.attributes('data-loading')).toBe('false')
    deleting.value = true
    await wrapper.vm.$nextTick()
    expect(btn.attributes('data-loading')).toBe('true')
  })
})
