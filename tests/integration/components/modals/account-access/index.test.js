import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

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

// Pinia auto-unwraps computed refs on the store instance, so the mock exposes
// a plain boolean getter (not a raw ref) to match how the real store reads.
const sessionState = { hasPasswordIdentity: false }
const mockSession = {
  get hasPasswordIdentity() {
    return sessionState.hasPasswordIdentity
  }
}
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))

import AccountAccessModal from '@/components/modals/account-access/index.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const MenuStub = defineComponent({
  name: 'AccountAccessMenu',
  emits: ['navigate'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'account-access-menu-stub' }, [
        h(
          'button',
          { 'data-testid': 'navigate-to-email', onClick: () => emit('navigate', 'email') },
          'go to email'
        ),
        h(
          'button',
          { 'data-testid': 'navigate-to-password', onClick: () => emit('navigate', 'password') },
          'go to password'
        )
      ])
  }
})

const EmailSectionStub = defineComponent({
  name: 'EmailSection',
  setup() {
    return () => h('div', { 'data-testid': 'email-section-stub' })
  }
})

const PasswordSectionStub = defineComponent({
  name: 'PasswordSection',
  setup() {
    return () => h('div', { 'data-testid': 'password-section-stub' })
  }
})

function makeWrapper() {
  const close = vi.fn()
  const wrapper = mount(AccountAccessModal, {
    props: { close },
    global: {
      stubs: {
        AccountAccessMenu: MenuStub,
        EmailSection: EmailSectionStub,
        PasswordSection: PasswordSectionStub
      },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, close }
}

beforeEach(() => {
  sessionState.hasPasswordIdentity = false
  mockEmitSfx.mockClear()
})

describe('AccountAccessModal header', () => {
  test('[obligation] shows the close button (not the back button) on the menu page', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="account-access-modal__back"]').exists()).toBe(false)
  })

  test('[obligation] shows the back button (not the close button) once navigated to a subpage', async () => {
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="navigate-to-email"]').trigger('click')

    expect(wrapper.find('[data-testid="account-access-modal__back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(false)
  })

  test('pressing the close button on the menu page calls the close prop', async () => {
    const { wrapper, close } = makeWrapper()
    await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })

  test('the dialog-card close event (backdrop/esc dismiss) also calls the close prop', async () => {
    const { wrapper, close } = makeWrapper()
    const dialogCard = wrapper.findComponent({ name: 'DialogCard' })

    dialogCard.vm.$emit('close')
    await wrapper.vm.$nextTick()

    expect(close).toHaveBeenCalledOnce()
  })

  test('[obligation] pressing the back button navigates to the menu page instead of closing', async () => {
    const { wrapper, close } = makeWrapper()
    await wrapper.find('[data-testid="navigate-to-email"]').trigger('click')
    expect(wrapper.find('[data-testid="email-section-stub"]').exists()).toBe(true)

    await wrapper.find('[data-testid="account-access-modal__back"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="account-access-menu-stub"]').exists()).toBe(true)
  })
})

describe('AccountAccessModal page routing', () => {
  test('renders the menu page by default', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="account-access-menu-stub"]').exists()).toBe(true)
  })

  test('navigates to the email section', async () => {
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="navigate-to-email"]').trigger('click')
    expect(wrapper.find('[data-testid="email-section-stub"]').exists()).toBe(true)
  })

  test('navigates to the password section', async () => {
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="navigate-to-password"]').trigger('click')
    expect(wrapper.find('[data-testid="password-section-stub"]').exists()).toBe(true)
  })
})

describe('AccountAccessModal title', () => {
  test('shows the password "set" heading when the member has no password identity', async () => {
    sessionState.hasPasswordIdentity = false
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="navigate-to-password"]').trigger('click')
    expect(wrapper.find('[data-testid="account-access-modal__header"]').text()).toContain(
      'Set a password'
    )
  })

  test('shows the password "change" heading when the member already has a password identity', async () => {
    sessionState.hasPasswordIdentity = true
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="navigate-to-password"]').trigger('click')
    expect(wrapper.find('[data-testid="account-access-modal__header"]').text()).toContain(
      'Change password'
    )
  })
})

describe('AccountAccessModal sfx', () => {
  test('plays the open chime on mount', () => {
    makeWrapper()
    expect(mockEmitSfx).toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('plays the close sfx on unmount', () => {
    const { wrapper } = makeWrapper()
    mockEmitSfx.mockClear()
    wrapper.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })
})
