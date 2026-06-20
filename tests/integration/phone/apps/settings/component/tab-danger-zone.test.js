import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import TabDangerZone from '@/phone/apps/settings/component/tab-danger-zone/index.vue'
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

function makeTab({ deleting = false } = {}) {
  const onDeleteAccount = vi.fn()
  const deleting_account = ref(deleting)
  const danger = { onDeleteAccount, deleting_account }
  const wrapper = mount(TabDangerZone, {
    global: {
      provide: { [memberDangerActionsKey]: danger },
      stubs: { UiButton: ButtonStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, onDeleteAccount, deleting_account }
}

describe('TabDangerZone', () => {
  test('renders the danger-zone container with the delete-account button', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-danger-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-delete-account-button"]').exists()).toBe(true)
  })

  test('invokes onDeleteAccount when the delete-account button is clicked', async () => {
    const { wrapper, onDeleteAccount } = makeTab()
    await wrapper.find('[data-testid="danger-delete-account-button"]').trigger('click')
    expect(onDeleteAccount).toHaveBeenCalledTimes(1)
  })

  test('reflects deleting_account ref on the button', async () => {
    const { wrapper, deleting_account } = makeTab()
    const btn = wrapper.find('[data-testid="danger-delete-account-button"]')
    expect(btn.attributes('data-loading')).toBe('false')
    deleting_account.value = true
    await wrapper.vm.$nextTick()
    expect(btn.attributes('data-loading')).toBe('true')
  })
})
