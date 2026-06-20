import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import DangerDeleteAccountButton from '@/phone/apps/settings/component/danger-delete-account-button.vue'
import { memberDangerActionsKey } from '@/composables/member/danger-actions'

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

function mountWith({ deleting = false } = {}) {
  const onDeleteAccount = vi.fn()
  const deleting_account = ref(deleting)
  const danger = { onDeleteAccount, deleting_account }
  const wrapper = mount(DangerDeleteAccountButton, {
    global: {
      provide: { [memberDangerActionsKey]: danger },
      stubs: { UiButton: ButtonStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, onDeleteAccount, deleting_account }
}

describe('DangerDeleteAccountButton', () => {
  test('renders with the shared testid', () => {
    const { wrapper } = mountWith()
    expect(wrapper.find('[data-testid="danger-delete-account-button"]').exists()).toBe(true)
  })

  test('invokes injected onDeleteAccount on click', async () => {
    const { wrapper, onDeleteAccount } = mountWith()
    await wrapper.find('[data-testid="danger-delete-account-button"]').trigger('click')
    expect(onDeleteAccount).toHaveBeenCalledTimes(1)
  })

  test('reflects deleting_account ref via data-loading', async () => {
    const { wrapper, deleting_account } = mountWith()
    const btn = wrapper.find('[data-testid="danger-delete-account-button"]')
    expect(btn.attributes('data-loading')).toBe('false')
    deleting_account.value = true
    await wrapper.vm.$nextTick()
    expect(btn.attributes('data-loading')).toBe('true')
  })

  test('disabled click is a no-op while deleting', async () => {
    const { wrapper, onDeleteAccount } = mountWith({ deleting: true })
    await wrapper.find('[data-testid="danger-delete-account-button"]').trigger('click')
    expect(onDeleteAccount).not.toHaveBeenCalled()
  })
})
