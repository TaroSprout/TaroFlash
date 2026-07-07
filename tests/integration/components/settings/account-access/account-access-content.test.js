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
  emits: ['pending'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'email-section-stub' }, [
        h(
          'button',
          { 'data-testid': 'email-section-stub__go-pending', onClick: () => emit('pending') },
          'go pending'
        )
      ])
  }
})

const PasswordSectionStub = defineComponent({
  name: 'PasswordSection',
  emits: ['success'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'password-section-stub' }, [
        h(
          'button',
          { 'data-testid': 'password-section-stub__go-success', onClick: () => emit('success') },
          'go success'
        )
      ])
  }
})

function mountContent(page = 'menu', props = {}) {
  return mount(AccountAccessContent, {
    props: { page, ...props },
    global: {
      stubs: {
        AccountAccessMenu: MenuStub,
        EmailSection: EmailSectionStub,
        PasswordSection: PasswordSectionStub
      },
      directives: { sfx: {} }
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

  test('title is the email heading when page is "email-success" [obligation]', () => {
    const wrapper = mountContent('email-success')
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

  test('title is the password heading when page is "password-success" [obligation]', () => {
    sessionState.hasPasswordIdentity = true
    const wrapper = mountContent('password-success')
    expect(wrapper.vm.title).toBe('Change password')
  })
})

describe('AccountAccessContent — no local max-width/gap constraint [obligation]', () => {
  test('[obligation] the root carries no max-w class — width is sourced from an ancestor (dialog-card size, or the standalone tab layout)', () => {
    const wrapper = mountContent('menu')
    const root = wrapper.find('[data-testid="account-access-content"]')
    expect(root.classes().some((c) => c.startsWith('max-w'))).toBe(false)
  })

  test('[obligation] the root carries no gap-* class — the container only ever has one active child at a time via the pager', () => {
    const wrapper = mountContent('menu')
    const root = wrapper.find('[data-testid="account-access-content"]')
    expect(root.classes().some((c) => c.startsWith('gap-'))).toBe(false)
  })
})

describe('AccountAccessContent — page routing (5 pages) [obligation]', () => {
  test('renders the menu by default', () => {
    const wrapper = mountContent('menu')
    expect(wrapper.find('[data-testid="account-access-menu-stub"]').exists()).toBe(true)
  })

  test('renders the email section when page is "email"', () => {
    const wrapper = mountContent('email')
    expect(wrapper.find('[data-testid="email-section-stub"]').exists()).toBe(true)
  })

  test('renders the email-success success panel when page is "email-success" [obligation]', () => {
    const wrapper = mountContent('email-success')
    expect(wrapper.find('[data-testid="account-access-modal__email-pending"]').exists()).toBe(true)
  })

  test('renders the password section when page is "password"', () => {
    const wrapper = mountContent('password')
    expect(wrapper.find('[data-testid="password-section-stub"]').exists()).toBe(true)
  })

  test('renders the password-success success panel when page is "password-success" [obligation]', () => {
    const wrapper = mountContent('password-success')
    expect(wrapper.find('[data-testid="account-access-modal__password-success"]').exists()).toBe(
      true
    )
  })

  test('emits update:page with the navigated page when the menu navigates', async () => {
    const wrapper = mountContent('menu')
    await wrapper.find('[data-testid="navigate-to-email"]').trigger('click')
    expect(wrapper.emitted('update:page')).toEqual([['email']])
  })

  test('email-section navigates to "email-success" when it emits pending [obligation]', async () => {
    const wrapper = mountContent('email')
    await wrapper.find('[data-testid="email-section-stub__go-pending"]').trigger('click')
    expect(wrapper.emitted('update:page')).toEqual([['email-success']])
  })

  test('password-section navigates to "password-success" when it emits success [obligation]', async () => {
    const wrapper = mountContent('password')
    await wrapper.find('[data-testid="password-section-stub__go-success"]').trigger('click')
    expect(wrapper.emitted('update:page')).toEqual([['password-success']])
  })

  test('switching pages runs the leave/enter transition hooks (gsap-mocked)', async () => {
    const wrapper = mountContent('menu')
    await wrapper.setProps({ page: 'email' })
    await flushTransition()
    expect(wrapper.find('[data-testid="email-section-stub"]').exists()).toBe(true)
  })
})

describe('AccountAccessContent — onSuccessClose dual behavior [obligation]', () => {
  describe('email-success page [obligation]', () => {
    test('resets page back to "menu" when no close prop is passed [obligation]', async () => {
      const wrapper = mountContent('email-success')
      await wrapper
        .find(
          '[data-testid="account-access-modal__email-pending"] [data-testid="account-access-success-panel__close"]'
        )
        .trigger('click')
      expect(wrapper.emitted('update:page')).toEqual([['menu']])
    })

    test('calls the close prop instead of resetting the page when one is passed [obligation]', async () => {
      const close = vi.fn()
      const wrapper = mountContent('email-success', { close })
      await wrapper
        .find(
          '[data-testid="account-access-modal__email-pending"] [data-testid="account-access-success-panel__close"]'
        )
        .trigger('click')
      expect(close).toHaveBeenCalledOnce()
      expect(wrapper.emitted('update:page')).toBeUndefined()
    })
  })

  describe('password-success page [obligation]', () => {
    test('resets page back to "menu" when no close prop is passed [obligation]', async () => {
      const wrapper = mountContent('password-success')
      await wrapper
        .find(
          '[data-testid="account-access-modal__password-success"] [data-testid="account-access-success-panel__close"]'
        )
        .trigger('click')
      expect(wrapper.emitted('update:page')).toEqual([['menu']])
    })

    test('calls the close prop instead of resetting the page when one is passed [obligation]', async () => {
      const close = vi.fn()
      const wrapper = mountContent('password-success', { close })
      await wrapper
        .find(
          '[data-testid="account-access-modal__password-success"] [data-testid="account-access-success-panel__close"]'
        )
        .trigger('click')
      expect(close).toHaveBeenCalledOnce()
      expect(wrapper.emitted('update:page')).toBeUndefined()
    })
  })
})
