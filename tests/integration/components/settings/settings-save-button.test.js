import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import SettingsSaveButton from '@/components/settings/settings-save-button.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsCloseKey } from '@/components/settings/layout'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Mirrors UiButton enough to expose disabled/click-when-disabled as data-* attrs
// and still forward click events so the handler runs.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: {
    loading: Boolean,
    disabled: Boolean,
    clickWhenDisabled: Boolean
  },
  emits: ['press'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'settings__save-button',
          'data-loading': String(!!props.loading),
          'data-disabled': String(!!props.disabled),
          'data-click-when-disabled': String(!!props.clickWhenDisabled),
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))

// ── Factory ───────────────────────────────────────────────────────────────────

function makeWrapper({ is_dirty = true, save_result = true } = {}) {
  const saveMember = vi.fn().mockResolvedValue(save_result)
  const close = vi.fn()

  const editor = {
    is_dirty: ref(is_dirty),
    saveMember
  }

  const wrapper = mount(SettingsSaveButton, {
    global: {
      provide: {
        [memberEditorKey]: editor,
        [settingsCloseKey]: close
      },
      stubs: { UiButton: UiButtonStub }
    }
  })

  return { wrapper, saveMember, close }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Disabled state ────────────────────────────────────────────────────────────

describe('settings-save-button — disabled state [obligation]', () => {
  test('button is disabled when is_dirty is false', () => {
    const { wrapper } = makeWrapper({ is_dirty: false })
    expect(wrapper.find('[data-testid="settings__save-button"]').attributes('data-disabled')).toBe(
      'true'
    )
  })

  test('button is not disabled when is_dirty is true', () => {
    const { wrapper } = makeWrapper({ is_dirty: true })
    expect(wrapper.find('[data-testid="settings__save-button"]').attributes('data-disabled')).toBe(
      'false'
    )
  })

  test('button has click-when-disabled prop when is_dirty is false [obligation]', () => {
    const { wrapper } = makeWrapper({ is_dirty: false })
    expect(
      wrapper.find('[data-testid="settings__save-button"]').attributes('data-click-when-disabled')
    ).toBe('true')
  })
})

// ── Save and close ────────────────────────────────────────────────────────────

describe('settings-save-button — save behaviour [obligation]', () => {
  test('clicking save calls saveMember', async () => {
    const { wrapper, saveMember } = makeWrapper({ is_dirty: true })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    expect(saveMember).toHaveBeenCalledOnce()
  })

  test('calls close() after saveMember resolves true [obligation]', async () => {
    const { wrapper, close } = makeWrapper({ is_dirty: true, save_result: true })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(close).toHaveBeenCalledOnce()
  })

  test('does NOT call close() when saveMember resolves false [obligation]', async () => {
    const { wrapper, close } = makeWrapper({ is_dirty: true, save_result: false })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(close).not.toHaveBeenCalled()
  })

  test('shows settings.save-error notice when saveMember resolves false [obligation]', async () => {
    const { wrapper } = makeWrapper({ is_dirty: true, save_result: false })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(mockNotice.error).toHaveBeenCalledWith("Couldn't save your changes. Please try again.")
  })

  test('does NOT show an error notice when saveMember resolves true', async () => {
    const { wrapper } = makeWrapper({ is_dirty: true, save_result: true })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('shows loading state while saveMember is in flight', async () => {
    let resolve
    const saveMember = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)))
    const close = vi.fn()
    const wrapper = mount(SettingsSaveButton, {
      global: {
        provide: {
          [memberEditorKey]: { is_dirty: ref(true), saveMember },
          [settingsCloseKey]: close
        },
        stubs: { UiButton: UiButtonStub }
      }
    })

    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    expect(wrapper.find('[data-testid="settings__save-button"]').attributes('data-loading')).toBe(
      'true'
    )

    resolve(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="settings__save-button"]').attributes('data-loading')).toBe(
      'false'
    )
  })
})
