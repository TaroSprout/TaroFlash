import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import '@/styles/main.css'

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

// mockIsMobile is shaped like a real Vue ref (`__v_isRef` + a `value`
// accessor) rather than a plain `{ value }` object — back-button.vue's
// template reads `is_mobile` unwrapped, which only happens for something
// Vue's `isRef` recognizes. `vue` can't be imported inside `vi.hoisted`
// (its callback runs before the module graph settles), so the shape is
// built by hand instead of via `ref()`.
const { mockCurrentRoute, mockGo, mockPush, mockHistoryState, mockIsMobile } = vi.hoisted(() => {
  let is_mobile = false
  return {
    mockCurrentRoute: { value: { name: 'dashboard' } },
    mockGo: vi.fn(),
    mockPush: vi.fn(),
    mockHistoryState: { back: '/dashboard' },
    mockIsMobile: {
      __v_isRef: true,
      get value() {
        return is_mobile
      },
      set value(next) {
        is_mobile = next
      }
    }
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    currentRoute: mockCurrentRoute,
    go: mockGo,
    push: mockPush,
    options: { history: { state: mockHistoryState } }
  })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => mockIsMobile
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

// ── Visibility by route name (feat/mobile-header-collapse) ───────────────────
// The button is always rendered now (never v-if'd away) so it keeps reserving
// the header's height; `invisible` (visibility: hidden) is what hides it on
// the dashboard route, so the effect is checked via getComputedStyle rather
// than the class name.

describe('back-button — visibility', () => {
  let attached_wrapper

  afterEach(() => {
    attached_wrapper?.unmount()
    attached_wrapper = undefined
  })

  function mountAttached(routeName) {
    mockCurrentRoute.value = { name: routeName }
    attached_wrapper = shallowMount(BackButton, {
      attachTo: document.body,
      global: { stubs: { UiButton: UiButtonStub } }
    })
    return attached_wrapper
  }

  test('stays rendered but visually hidden on the dashboard route', () => {
    const wrapper = mountAttached('dashboard')
    const button = wrapper.find('button')

    expect(button.exists()).toBe(true)
    expect(getComputedStyle(button.element).visibility).toBe('hidden')
  })

  test('is visible on a non-dashboard route (deck)', () => {
    const wrapper = mountAttached('deck')
    const button = wrapper.find('button')

    expect(getComputedStyle(button.element).visibility).not.toBe('hidden')
  })

  test('is visible on any other named route', () => {
    const wrapper = mountAttached('settings')
    const button = wrapper.find('button')

    expect(getComputedStyle(button.element).visibility).not.toBe('hidden')
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

  test('falls back to the dashboard route when history.state.back is falsy', async () => {
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

describe('back-button — resolved chrome', () => {
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

// ── Mobile vs desktop chrome (feat/mobile-header-collapse) ────────────────────
// is_mobile only flips icon-only now — size is a constant `sm` at every
// breakpoint — asserted through the real UiButton so the label's presence in
// btn-content (not just the prop) is what's checked.

describe('back-button — mobile vs desktop', () => {
  afterEach(() => {
    mockIsMobile.value = false
  })

  test('on mobile, renders the "Back" label instead of going icon-only', () => {
    mockIsMobile.value = true
    const wrapper = mountReal('deck')

    const button = wrapper.find('[data-testid="ui-kit-button"]')
    const label = wrapper.find('[data-testid="ui-kit-button__label"]')

    expect(button.classes()).not.toContain('ui-kit-btn--icon-only')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Back')
  })

  test('on mobile, stays at the constant sm size', () => {
    mockIsMobile.value = true
    const wrapper = mountReal('deck')

    expect(wrapper.find('[data-testid="ui-kit-button"]').classes()).toContain('ui-kit-btn--sm')
  })

  test('on sm+, stays icon-only with no visible label in the content', () => {
    mockIsMobile.value = false
    const wrapper = mountReal('deck')

    const button = wrapper.find('[data-testid="ui-kit-button"]')
    const label = wrapper.find('[data-testid="ui-kit-button__label"]')

    expect(button.classes()).toContain('ui-kit-btn--icon-only')
    expect(label.exists()).toBe(false)
  })

  test('on sm+, stays at the same constant sm size', () => {
    mockIsMobile.value = false
    const wrapper = mountReal('deck')

    expect(wrapper.find('[data-testid="ui-kit-button"]').classes()).toContain('ui-kit-btn--sm')
  })
})
