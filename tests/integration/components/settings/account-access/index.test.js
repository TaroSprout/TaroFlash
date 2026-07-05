import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    set: vi.fn()
  }
}))

import AccountAccessModal from '@/components/settings/account-access/index.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Mirrors account-access-content's own page/title contract — the modal only
// depends on the exposed `title` and the v-model:page it forwards, so this
// stub keeps the modal's own header/back/close wiring under direct test.
const AccountAccessContentStub = defineComponent({
  name: 'AccountAccessContent',
  props: { page: { type: String, required: true } },
  emits: ['update:page'],
  setup(props, { emit, expose }) {
    const titles = {
      menu: 'Login Details',
      email: 'Update Email',
      password: 'Change password'
    }
    expose({ title: computed(() => titles[props.page]) })
    return () =>
      h('div', { 'data-testid': 'account-access-content-stub' }, [
        h(
          'button',
          {
            'data-testid': 'content-navigate-email',
            onClick: () => emit('update:page', 'email')
          },
          'go to email'
        )
      ])
  }
})

// Real UiButton only renders its default slot into the DOM as a hover-tooltip
// (icon-only buttons keep their label out of the static tree) — stub it so the
// close/back label text is directly assertable without simulating a hover.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

function makeWrapper() {
  const close = vi.fn()
  const wrapper = mount(AccountAccessModal, {
    props: { close },
    global: {
      stubs: { AccountAccessContent: AccountAccessContentStub, UiButton: UiButtonStub }
    }
  })
  return { wrapper, close }
}

beforeEach(() => mockEmitSfx.mockClear())

describe('AccountAccessModal — chrome (close/back) [obligation]', () => {
  test('renders the close button (not back) while on the menu page [obligation]', () => {
    const { wrapper } = makeWrapper()
    const close_button = wrapper.find('[data-testid="dialog-card__close"]')
    expect(close_button.exists()).toBe(true)
    expect(close_button.text()).toContain('Close')
    expect(wrapper.find('[data-testid="account-access-modal__back"]').exists()).toBe(false)
  })

  test('pressing close on the menu page calls close() [obligation]', async () => {
    const { wrapper, close } = makeWrapper()
    await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })

  test('renders the back button (not close) once navigated to a sub-page [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="content-navigate-email"]').trigger('click')

    const back_button = wrapper.find('[data-testid="account-access-modal__back"]')
    expect(back_button.exists()).toBe(true)
    expect(back_button.text()).toContain('Back')
    expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(false)
  })

  test('pressing back resets page to "menu" instead of exiting the modal [obligation]', async () => {
    const { wrapper, close } = makeWrapper()
    await wrapper.find('[data-testid="content-navigate-email"]').trigger('click')
    expect(wrapper.vm.page).toBe('email')

    await wrapper.find('[data-testid="account-access-modal__back"]').trigger('click')

    expect(wrapper.vm.page).toBe('menu')
    expect(close).not.toHaveBeenCalled()
  })

  test('the dialog-card close event (backdrop/esc dismiss) also calls close() [obligation]', async () => {
    const { wrapper, close } = makeWrapper()
    const dialogCard = wrapper.findComponent({ name: 'DialogCard' })
    dialogCard.vm.$emit('close')
    await wrapper.vm.$nextTick()
    expect(close).toHaveBeenCalledOnce()
  })
})

describe('AccountAccessModal — header title reflects content.title [obligation]', () => {
  test('shows the menu title by default [obligation]', async () => {
    const { wrapper } = makeWrapper()
    // The header title reads content.title through a template ref, which is
    // only populated after the initial render commits — an extra tick is
    // needed before the ref-driven re-render lands.
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('Login Details')
  })

  test('shows the exposed content title after navigating to a sub-page [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="content-navigate-email"]').trigger('click')
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('Update Email')
  })
})

describe('AccountAccessModal — sfx [obligation]', () => {
  test('plays wooden_chime_ring on mount [obligation]', () => {
    makeWrapper()
    expect(mockEmitSfx).toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('plays pop_up_close on unmount [obligation]', () => {
    const { wrapper } = makeWrapper()
    mockEmitSfx.mockClear()
    wrapper.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })
})
