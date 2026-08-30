import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import UiButton from '@/components/ui-kit/button.vue'

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockCurrentRoute, mockGo, mockPush, mockHistoryState } = vi.hoisted(() => ({
  mockCurrentRoute: { value: { name: 'dashboard' } },
  mockGo: vi.fn(),
  mockPush: vi.fn(),
  mockHistoryState: { back: '/dashboard' }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    currentRoute: mockCurrentRoute,
    go: mockGo,
    push: mockPush,
    options: { history: { state: mockHistoryState } }
  })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

vi.mock('gsap', () => ({ gsap: { to: vi.fn(), fromTo: vi.fn() } }))

// UiButton stub — forwards attrs so data-testid survives, emits press on click
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconOnly', 'iconLeft', 'size', 'sfx'],
  emits: ['press'],
  setup(_p, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('button', {
        ...attrs,
        onClick: () => emit('press')
      })
  }
})

import BackButton from '@/views/app-shell/nav-bar/back-button.vue'

function mountStubbed(routeName) {
  mockCurrentRoute.value = { name: routeName }
  return shallowMount(BackButton, {
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

// ── Visibility by route name (obligation 6) ───────────────────────────────────

describe('back-button — visibility [obligation]', () => {
  test('is hidden (v-if removes it) when on the dashboard route', () => {
    const wrapper = mountStubbed('dashboard')
    expect(wrapper.findComponent(UiButton).exists()).toBe(false)
  })

  test('is visible on a non-dashboard route (deck)', () => {
    const wrapper = mountStubbed('deck')
    expect(wrapper.findComponent(UiButton).exists()).toBe(true)
  })

  test('is visible on any other named route', () => {
    const wrapper = mountStubbed('settings')
    expect(wrapper.findComponent(UiButton).exists()).toBe(true)
  })

  test('is hidden specifically when route.name is "dashboard" string', () => {
    // Guards against case-sensitivity or partial-match regressions
    const wrapper = mountStubbed('dashboard')
    expect(wrapper.html()).not.toContain('<button')
  })
})

// ── Press handler ─────────────────────────────────────────────────────────────

describe('back-button — press handler', () => {
  beforeEach(() => {
    mockGo.mockClear()
    mockPush.mockClear()
  })

  test('calls router.go(-1) when there is a router-tracked previous entry', async () => {
    mockHistoryState.back = '/dashboard'
    const wrapper = mountStubbed('deck')
    await wrapper.findComponent(UiButtonStub).trigger('click')
    expect(mockGo).toHaveBeenCalledWith(-1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  test('falls back to the dashboard route when history.state.back is falsy [obligation]', async () => {
    mockHistoryState.back = null
    const wrapper = mountStubbed('deck')
    await wrapper.findComponent(UiButtonStub).trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(mockGo).not.toHaveBeenCalled()
  })
})

// ── Resolved chrome — on-accent role, not neutral (TARO-240) ──────────────────
// Mounts the real UiButton (only UiTooltip is stubbed, forwarding its merged
// class onto a real <button>) so the class list reflects UiButton's own
// `neutral` branch instead of a stub that can't tell the two apart.

const UiTooltipSlotStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['element', 'gap', 'suppress', 'text'],
  setup(_props, { slots, attrs }) {
    return () => h('button', { ...attrs, 'data-testid': 'ui-kit-button' }, slots.default?.())
  }
})

function mountReal(routeName) {
  mockCurrentRoute.value = { name: routeName }
  return mount(BackButton, {
    global: { stubs: { UiTooltip: UiTooltipSlotStub }, directives: { sfx: {} } }
  })
}

describe('back-button — resolved chrome [obligation]', () => {
  test('does not carry the neutral/raised chrome variant class', () => {
    const wrapper = mountReal('deck')
    const class_list = wrapper.find('[data-testid="ui-kit-button"]').classes()
    expect(class_list).not.toContain('ui-kit-btn--neutral')
  })

  test('carries the on-accent bg-color override class', () => {
    const wrapper = mountReal('deck')
    const class_list = wrapper.find('[data-testid="ui-kit-button"]').classes()
    expect(class_list).toContain('[--btn-bg-color:var(--color-on-accent)]!')
  })

  test('carries the on-accent text-color override class', () => {
    const wrapper = mountReal('deck')
    const class_list = wrapper.find('[data-testid="ui-kit-button"]').classes()
    expect(class_list).toContain('[--btn-text-color:var(--color-accent)]!')
  })
})
