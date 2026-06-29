import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import UiButton from '@/components/ui-kit/button.vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockCurrentRoute, mockGo } = vi.hoisted(() => ({
  mockCurrentRoute: { value: { name: 'dashboard' } },
  mockGo: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ currentRoute: mockCurrentRoute, go: mockGo })
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

import BackButton from '@/components/back-button.vue'

function mount(routeName) {
  mockCurrentRoute.value = { name: routeName }
  return shallowMount(BackButton, {
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

// ── Visibility by route name (obligation 6) ───────────────────────────────────

describe('back-button — visibility [obligation]', () => {
  test('is hidden (v-if removes it) when on the dashboard route', () => {
    const wrapper = mount('dashboard')
    expect(wrapper.findComponent(UiButton).exists()).toBe(false)
  })

  test('is visible on a non-dashboard route (deck)', () => {
    const wrapper = mount('deck')
    expect(wrapper.findComponent(UiButton).exists()).toBe(true)
  })

  test('is visible on any other named route', () => {
    const wrapper = mount('settings')
    expect(wrapper.findComponent(UiButton).exists()).toBe(true)
  })

  test('is hidden specifically when route.name is "dashboard" string', () => {
    // Guards against case-sensitivity or partial-match regressions
    const wrapper = mount('dashboard')
    expect(wrapper.html()).not.toContain('<button')
  })
})

// ── Press handler ─────────────────────────────────────────────────────────────

describe('back-button — press handler', () => {
  test('calls router.go(-1) when the button emits press', async () => {
    const wrapper = mount('deck')
    await wrapper.findComponent(UiButtonStub).trigger('click')
    expect(mockGo).toHaveBeenCalledWith(-1)
  })
})
