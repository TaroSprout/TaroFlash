import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

import TabIndex from '@/views/settings/tab-index/index.vue'
import { memberDangerActionsKey } from '@/composables/member/danger-actions'
import { settingsLayoutKey } from '@/views/settings/layout'

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

const IconStub = defineComponent({
  name: 'UiIcon',
  props: { src: { type: String, required: true } },
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

function makeTab(layout_mode = 'tablet') {
  const onDeleteAccount = vi.fn()
  const danger = { onDeleteAccount, deleting_account: ref(false) }
  const wrapper = mount(TabIndex, {
    global: {
      provide: {
        [memberDangerActionsKey]: danger,
        [settingsLayoutKey]: computed(() => layout_mode)
      },
      stubs: { UiButton: ButtonStub, UiIcon: IconStub, SettingsSaveButton: true },
      mocks: { $t: (k) => k },
      directives: { sfx: {} }
    }
  })
  return { wrapper, onDeleteAccount }
}

describe('TabIndex', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('renders both nav groups with all four nav cards, labeled from settings.tab.*', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-index"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-index__nav-group--account"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-index__nav-group--app"]').exists()).toBe(true)

    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(cards).toHaveLength(4)
    expect(cards.map((c) => c.attributes('data-value'))).toEqual([
      'profile',
      'subscription',
      'app',
      'review-preferences'
    ])
    expect(cards[0].text()).toContain('Profile')
    expect(cards[1].text()).toContain('Subscription')
    expect(cards[2].text()).toContain('App Settings')
    expect(cards[3].text()).toContain('Study Settings')
  })

  test('emits navigate with the clicked entry value', async () => {
    const { wrapper } = makeTab()
    await wrapper
      .find('[data-testid="options-panel__card"][data-value="subscription"]')
      .trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['subscription']])
  })

  test('renders the inlined delete-account button', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-index__danger-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-delete-account-button"]').exists()).toBe(true)
  })

  test('forwards delete-account click to injected danger.onDeleteAccount', async () => {
    const { wrapper, onDeleteAccount } = makeTab()
    await wrapper.find('[data-testid="danger-delete-account-button"]').trigger('click')
    expect(onDeleteAccount).toHaveBeenCalledTimes(1)
  })
})

describe('TabIndex — account-access nav entry (sheet-only) [obligation]', () => {
  test('includes account-access in the account group on sheet layout [obligation]', () => {
    const { wrapper } = makeTab('sheet')
    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(cards.map((c) => c.attributes('data-value'))).toEqual([
      'profile',
      'subscription',
      'account-access',
      'app',
      'review-preferences'
    ])
  })

  test('omits account-access from the account group on tablet layout [obligation]', () => {
    const { wrapper } = makeTab('tablet')
    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(cards.map((c) => c.attributes('data-value'))).not.toContain('account-access')
  })

  test('omits account-access from the account group on desktop layout [obligation]', () => {
    const { wrapper } = makeTab('desktop')
    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(cards.map((c) => c.attributes('data-value'))).not.toContain('account-access')
  })
})
