import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

const { coarseRef } = vi.hoisted(() => ({ coarseRef: { value: false } }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => coarseRef }))

vi.mock('gsap', () => ({ gsap: { to: vi.fn((_el, opts) => opts?.onComplete?.()) } }))

const mockGoogleActions = {
  loading: ref(false),
  hasGoogleIdentity: ref(false),
  hasPasswordIdentity: ref(true),
  onConnect: vi.fn(),
  onDisconnect: vi.fn()
}
vi.mock('@/components/settings/account-access/use-google-actions', () => ({
  useGoogleActions: () => mockGoogleActions
}))

import AccountAccessMenu from '@/components/settings/account-access/account-access-menu.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// UiTooltip wraps UiButton's native element; stub renders as a real element and
// forwards attrs/click so UiButton's own disabled-blocking JS logic still runs.
const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['element', 'gap', 'suppress', 'static_on_mobile', 'text'],
  setup(_props, { slots, attrs }) {
    return () => h('button', { ...attrs }, slots.default?.())
  }
})

const NavListStub = defineComponent({
  name: 'UiNavList',
  props: ['entries'],
  emits: ['navigate'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { 'data-testid': 'ui-nav-list-stub' },
        props.entries.map((entry) =>
          h(
            'button',
            {
              key: entry.value,
              'data-testid': 'nav-list__card',
              'data-value': entry.value,
              onClick: () => emit('navigate', entry.value)
            },
            entry.label
          )
        )
      )
  }
})

function makeWrapper() {
  return mount(AccountAccessMenu, {
    global: {
      stubs: { UiTooltip: UiTooltipStub, UiNavList: NavListStub },
      directives: { sfx: {} }
    }
  })
}

beforeEach(() => {
  mockGoogleActions.loading.value = false
  mockGoogleActions.hasGoogleIdentity.value = false
  mockGoogleActions.hasPasswordIdentity.value = true
  mockGoogleActions.onConnect.mockReset()
  mockGoogleActions.onDisconnect.mockReset()
})

describe('AccountAccessMenu', () => {
  test('renders the description paragraph', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="account-access-modal__description"]').text()).toBe(
      'Update your email, password, and connected accounts.'
    )
  })

  test('renders the nav list with email and password entries', () => {
    const wrapper = makeWrapper()
    const cards = wrapper.findAll('[data-testid="nav-list__card"]')
    expect(cards.map((c) => c.attributes('data-value'))).toEqual(['email', 'password'])
  })

  test('emits navigate with the tapped entry value', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="nav-list__card"][data-value="password"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['password']])
  })

  test('calls onConnect when the google button is pressed and no google identity exists', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="account-access-modal__google-button"]').trigger('click')
    expect(mockGoogleActions.onConnect).toHaveBeenCalledOnce()
    expect(mockGoogleActions.onDisconnect).not.toHaveBeenCalled()
  })

  test('calls onDisconnect when the google button is pressed and a google identity exists', async () => {
    mockGoogleActions.hasGoogleIdentity.value = true
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="account-access-modal__google-button"]').trigger('click')
    expect(mockGoogleActions.onDisconnect).toHaveBeenCalledOnce()
    expect(mockGoogleActions.onConnect).not.toHaveBeenCalled()
  })

  test('[obligation] disables the google button, blocking the press, when the google identity is the last remaining identity', async () => {
    mockGoogleActions.hasGoogleIdentity.value = true
    mockGoogleActions.hasPasswordIdentity.value = false
    const wrapper = makeWrapper()
    const button = wrapper.find('[data-testid="account-access-modal__google-button"]')

    expect(button.attributes('aria-disabled')).toBe('true')

    await button.trigger('click')

    expect(mockGoogleActions.onDisconnect).not.toHaveBeenCalled()
    expect(mockGoogleActions.onConnect).not.toHaveBeenCalled()
  })

  test('shows the connect label when there is no google identity', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="account-access-modal__google-button"]').text()).toContain(
      'Connect Google Account'
    )
  })

  test('shows the disconnect label when a google identity exists', () => {
    mockGoogleActions.hasGoogleIdentity.value = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="account-access-modal__google-button"]').text()).toContain(
      'Disconnect Google Account'
    )
  })

  test('forwards the composable loading state to the google button (renders the loading-dots icon)', () => {
    mockGoogleActions.loading.value = true
    const wrapper = makeWrapper()
    const button = wrapper.find('[data-testid="account-access-modal__google-button"]')
    const icons = button.findAll('[data-testid="ui-kit-icon"]')
    expect(icons.some((icon) => icon.attributes('alt') === 'loading-dots')).toBe(true)
  })
})
