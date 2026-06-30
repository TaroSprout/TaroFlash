import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import DarkmodeApp from '@/components/taro-phone/apps/darkmode-app.vue'
import { useThemeStore } from '@/stores/theme'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

function makeWrapper() {
  return mount(DarkmodeApp, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })] }
  })
}

describe('DarkmodeApp — theme cycling [obligation]', () => {
  test('clicking calls theme_store.cycle() directly with no useTaroPhoneStore interaction', async () => {
    const wrapper = makeWrapper()
    const theme_store = useThemeStore()
    expect(theme_store.mode).toBe('system')

    await wrapper.find('[data-testid="phone-app"]').trigger('click')

    // useMatchMedia is mocked to always report `false`, so is_system_dark is
    // false and the cycle order is system -> dark -> light -> system.
    expect(theme_store.mode).toBe('dark')
  })

  test('a second click continues cycling the theme', async () => {
    const wrapper = makeWrapper()
    const theme_store = useThemeStore()

    await wrapper.find('[data-testid="phone-app"]').trigger('click')
    await wrapper.find('[data-testid="phone-app"]').trigger('click')

    expect(theme_store.mode).toBe('light')
  })

  test('plays the select sfx on click', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone-app"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('select')
  })
})
