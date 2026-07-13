import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import DashboardMobileFooter from '@/views/dashboard/mobile-footer/index.vue'

const MobileDockStub = defineComponent({
  name: 'MobileDock',
  props: { breakpoint: { type: String, default: 'xl' } },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        { 'data-testid': 'mobile-dock-stub', 'data-breakpoint': props.breakpoint },
        slots.default?.()
      )
  }
})

const FooterActionsStub = defineComponent({
  name: 'FooterActions',
  props: ['due_decks', 'editing_decks'],
  emits: ['toggle-edit-decks'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        { 'data-testid': 'footer-actions-stub', onClick: () => emit('toggle-edit-decks') },
        String(props.due_decks.length)
      )
  }
})

function mountFooter(props = {}) {
  return mount(DashboardMobileFooter, {
    props: { due_decks: [], ...props },
    global: { stubs: { MobileDock: MobileDockStub, FooterActions: FooterActionsStub } }
  })
}

describe('DashboardMobileFooter', () => {
  test('renders mobile-dock with breakpoint="mxl"', () => {
    const wrapper = mountFooter()

    expect(wrapper.find('[data-testid="mobile-dock-stub"]').attributes('data-breakpoint')).toBe(
      'mxl'
    )
  })

  test('passes due_decks and editing_decks through to footer-actions', () => {
    const due_decks = [{ id: 1 }, { id: 2 }]
    const wrapper = mountFooter({ due_decks, editing_decks: true })
    const stub = wrapper.findComponent(FooterActionsStub)

    expect(stub.props('due_decks')).toEqual(due_decks)
    expect(stub.props('editing_decks')).toBe(true)
  })

  test('re-emits toggle-edit-decks from footer-actions', async () => {
    const wrapper = mountFooter()

    await wrapper.find('[data-testid="footer-actions-stub"]').trigger('click')

    expect(wrapper.emitted('toggle-edit-decks')).toHaveLength(1)
  })
})
