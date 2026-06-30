import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, computed } from 'vue'
import SettingsBackButton from '@/components/settings/settings-back-button.vue'
import { settingsLayoutKey } from '@/components/settings/layout'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Stubs UiButton with enough surface to test disabled/class/click forwarding.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          'data-testid': attrs['data-testid'] ?? 'settings__back-button',
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeWrapper(layout_mode_value = 'sheet') {
  const layout_mode = computed(() => layout_mode_value)

  const wrapper = mount(SettingsBackButton, {
    global: {
      provide: {
        [settingsLayoutKey]: layout_mode
      },
      stubs: { UiButton: UiButtonStub }
    }
  })

  return { wrapper }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── v-if rendering ────────────────────────────────────────────────────────────

describe('settings-back-button — rendering [obligation]', () => {
  test('is not rendered at all when layout_mode is "desktop" [obligation]', () => {
    const { wrapper } = makeWrapper('desktop')
    // v-if removes the element entirely
    expect(wrapper.find('[data-testid="settings__back-button"]').exists()).toBe(false)
  })

  test('is rendered when layout_mode is "sheet"', () => {
    const { wrapper } = makeWrapper('sheet')
    expect(wrapper.find('[data-testid="settings__back-button"]').exists()).toBe(true)
  })

  test('is rendered when layout_mode is "tablet"', () => {
    const { wrapper } = makeWrapper('tablet')
    expect(wrapper.find('[data-testid="settings__back-button"]').exists()).toBe(true)
  })
})

// ── -mb-4 class ───────────────────────────────────────────────────────────────

describe('settings-back-button — sheet-only -mb-4 class [obligation]', () => {
  test('applies -mb-4 class on sheet mode', () => {
    const { wrapper } = makeWrapper('sheet')
    const btn = wrapper.find('[data-testid="settings__back-button"]')
    expect(btn.classes()).toContain('-mb-4')
  })

  test('does not apply -mb-4 class on tablet mode', () => {
    const { wrapper } = makeWrapper('tablet')
    const btn = wrapper.find('[data-testid="settings__back-button"]')
    expect(btn.classes()).not.toContain('-mb-4')
  })
})

// ── emit back ─────────────────────────────────────────────────────────────────

describe('settings-back-button — back emit', () => {
  test('emits "back" when clicked on sheet mode', async () => {
    const { wrapper } = makeWrapper('sheet')
    await wrapper.find('[data-testid="settings__back-button"]').trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })

  test('emits "back" when clicked on tablet mode', async () => {
    const { wrapper } = makeWrapper('tablet')
    await wrapper.find('[data-testid="settings__back-button"]').trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })
})
