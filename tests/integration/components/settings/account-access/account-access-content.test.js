import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

// Vue Test Utils stubs the built-in <transition> by default (no lifecycle
// hooks fire). Wait through the real JS-hook cycle — 2x rAF even with
// `:css="false"` — so onLeave/onEnter run for real against the gsap mock.
async function flushTransition() {
  await nextTick()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  await flushPromises()
}

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// onComplete resolves on a microtask, not synchronously — a real GSAP tween
// never completes within the same call stack as the leave hook, and calling
// done() synchronously during a real (unstubbed) unmount transition crashes
// Vue's internal removal bookkeeping (`afterLeave` reads a detached parentNode).
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, opts) => {
      Promise.resolve().then(() => opts?.onComplete?.())
    }),
    to: vi.fn((_el, opts) => {
      Promise.resolve().then(() => opts?.onComplete?.())
    }),
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

import AccountAccessContent from '@/components/settings/account-access/account-access-content.vue'

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

function mountContent(page = 'menu') {
  return mount(AccountAccessContent, {
    props: { page },
    global: {
      stubs: {
        AccountAccessMenu: MenuStub,
        EmailSection: EmailSectionStub,
        PasswordSection: PasswordSectionStub,
        transition: false
      }
    }
  })
}

beforeEach(() => {
  sessionState.hasPasswordIdentity = false
})

describe('AccountAccessContent — title computed [obligation]', () => {
  test('title is the menu heading when page is "menu" [obligation]', () => {
    const wrapper = mountContent('menu')
    expect(wrapper.vm.title).toBe('Login Details')
  })

  test('title is the email heading when page is "email" [obligation]', () => {
    const wrapper = mountContent('email')
    expect(wrapper.vm.title).toBe('Update Email')
  })

  test('title is the password "set" heading when page is "password" and the member has no password identity [obligation]', () => {
    sessionState.hasPasswordIdentity = false
    const wrapper = mountContent('password')
    expect(wrapper.vm.title).toBe('Set a password')
  })

  test('title is the password "change" heading when page is "password" and the member already has a password identity [obligation]', () => {
    sessionState.hasPasswordIdentity = true
    const wrapper = mountContent('password')
    expect(wrapper.vm.title).toBe('Change password')
  })
})

describe('AccountAccessContent — page routing', () => {
  test('renders the menu by default', () => {
    const wrapper = mountContent('menu')
    expect(wrapper.find('[data-testid="account-access-menu-stub"]').exists()).toBe(true)
  })

  test('renders the email section when page is "email"', () => {
    const wrapper = mountContent('email')
    expect(wrapper.find('[data-testid="email-section-stub"]').exists()).toBe(true)
  })

  test('renders the password section when page is "password"', () => {
    const wrapper = mountContent('password')
    expect(wrapper.find('[data-testid="password-section-stub"]').exists()).toBe(true)
  })

  test('emits update:page with the navigated page when the menu navigates', async () => {
    const wrapper = mountContent('menu')
    await wrapper.find('[data-testid="navigate-to-email"]').trigger('click')
    expect(wrapper.emitted('update:page')).toEqual([['email']])
  })

  test('shows the description paragraph only on the menu page', () => {
    expect(
      mountContent('menu').find('[data-testid="account-access-modal__description"]').exists()
    ).toBe(true)
    expect(
      mountContent('email').find('[data-testid="account-access-modal__description"]').exists()
    ).toBe(false)
  })

  test('switching pages runs the leave/enter transition hooks (gsap-mocked)', async () => {
    const wrapper = mountContent('menu')
    await wrapper.setProps({ page: 'email' })
    await flushTransition()
    expect(wrapper.find('[data-testid="email-section-stub"]').exists()).toBe(true)
  })
})
