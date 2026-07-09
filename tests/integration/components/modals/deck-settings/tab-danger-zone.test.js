import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import TabDangerZone from '@/views/deck/deck-settings/tab-danger-zone/index.vue'
import { deckDangerActionsKey } from '@/composables/deck/danger-actions'

const ButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: { type: Boolean, default: false } },
  emits: ['press'],
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
          onClick: (e) => emit('press', e)
        },
        slots.default?.()
      )
  }
})

function makeTab({ deleting = false, resetting_reviews = false } = {}) {
  const deletingRef = ref(deleting)
  const resettingReviewsRef = ref(resetting_reviews)
  const onDelete = vi.fn()
  const onResetReviews = vi.fn()
  const danger = {
    onDelete,
    onResetReviews,
    deleting: deletingRef,
    resetting_reviews: resettingReviewsRef
  }
  const wrapper = mount(TabDangerZone, {
    global: {
      provide: { [deckDangerActionsKey]: danger },
      stubs: { UiButton: ButtonStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, deletingRef, resettingReviewsRef, onDelete, onResetReviews }
}

describe('TabDangerZone', () => {
  test('renders the danger-zone container with both action buttons', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-danger-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-delete-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-reset-button"]').exists()).toBe(true)
  })

  test('invokes onDelete from injected danger actions when delete is clicked', async () => {
    const { wrapper, onDelete } = makeTab()
    await wrapper.find('[data-testid="danger-delete-button"]').trigger('click')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('invokes onResetReviews when reset is clicked', async () => {
    const { wrapper, onResetReviews } = makeTab()
    await wrapper.find('[data-testid="danger-reset-button"]').trigger('click')
    expect(onResetReviews).toHaveBeenCalledTimes(1)
  })

  test('reflects deleting ref on the delete button', async () => {
    const { wrapper, deletingRef } = makeTab({ deleting: false })
    const btn = wrapper.find('[data-testid="danger-delete-button"]')
    expect(btn.attributes('data-loading')).toBe('false')
    deletingRef.value = true
    await wrapper.vm.$nextTick()
    expect(btn.attributes('data-loading')).toBe('true')
  })

  test('reflects resetting_reviews ref on the reset button', async () => {
    const { wrapper, resettingReviewsRef } = makeTab({ resetting_reviews: false })
    const btn = wrapper.find('[data-testid="danger-reset-button"]')
    expect(btn.attributes('data-loading')).toBe('false')
    resettingReviewsRef.value = true
    await wrapper.vm.$nextTick()
    expect(btn.attributes('data-loading')).toBe('true')
  })

  test('does not invoke onDelete while loading (button disabled)', async () => {
    const { wrapper, onDelete } = makeTab({ deleting: true })
    await wrapper.find('[data-testid="danger-delete-button"]').trigger('click')
    expect(onDelete).not.toHaveBeenCalled()
  })

  test('does not invoke onResetReviews while resetting (button disabled)', async () => {
    const { wrapper, onResetReviews } = makeTab({ resetting_reviews: true })
    await wrapper.find('[data-testid="danger-reset-button"]').trigger('click')
    expect(onResetReviews).not.toHaveBeenCalled()
  })
})
