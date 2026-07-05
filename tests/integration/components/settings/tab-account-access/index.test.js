import { describe, test, expect, vi } from 'vite-plus/test'
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

import TabAccountAccess from '@/components/settings/tab-account-access/index.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const AccountAccessContentStub = defineComponent({
  name: 'AccountAccessContent',
  props: { page: { type: String, required: true } },
  emits: ['update:page'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'account-access-content-stub', 'data-page': props.page }, [
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

function makeWrapper() {
  return mount(TabAccountAccess, {
    global: { stubs: { AccountAccessContent: AccountAccessContentStub } }
  })
}

describe('TabAccountAccess', () => {
  test('renders the account-access content starting on the menu page', () => {
    const wrapper = makeWrapper()
    expect(
      wrapper.find('[data-testid="account-access-content-stub"]').attributes('data-page')
    ).toBe('menu')
  })

  test('navigating updates the forwarded page', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="content-navigate-email"]').trigger('click')
    expect(
      wrapper.find('[data-testid="account-access-content-stub"]').attributes('data-page')
    ).toBe('email')
  })
})

describe('TabAccountAccess — onChromeBack() [obligation]', () => {
  test('returns false and leaves page untouched when already on the menu page [obligation]', () => {
    const wrapper = makeWrapper()
    const result = wrapper.vm.onChromeBack()

    expect(result).toBe(false)
    expect(
      wrapper.find('[data-testid="account-access-content-stub"]').attributes('data-page')
    ).toBe('menu')
  })

  test('returns true and resets page to "menu" when on a sub-page [obligation]', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="content-navigate-email"]').trigger('click')

    const result = wrapper.vm.onChromeBack()
    await wrapper.vm.$nextTick()

    expect(result).toBe(true)
    expect(
      wrapper.find('[data-testid="account-access-content-stub"]').attributes('data-page')
    ).toBe('menu')
  })
})

describe('TabAccountAccess — sfx [obligation]', () => {
  test('does not play the modal open chime on mount (tab variant has no chrome sfx) [obligation]', () => {
    mockEmitSfx.mockClear()
    makeWrapper()
    expect(mockEmitSfx).not.toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('does not play the modal close sfx on unmount (tab variant has no chrome sfx) [obligation]', () => {
    const wrapper = makeWrapper()
    mockEmitSfx.mockClear()
    wrapper.unmount()
    expect(mockEmitSfx).not.toHaveBeenCalledWith('pop_up_close')
  })
})
