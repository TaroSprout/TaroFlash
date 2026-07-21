import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import SettingsSaveButton from '@/views/settings/settings-save-button.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsCloseKey } from '@/views/settings/layout'

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
  inheritAttrs: false,
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
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

function makeWrapper({ is_dirty = true, save_result = 'success', has_name = true } = {}) {
  const saveMember = vi.fn().mockResolvedValue(save_result)
  const resetChanges = vi.fn()
  const close = vi.fn()

  const editor = {
    is_dirty: ref(is_dirty),
    has_name: ref(has_name),
    name_error: ref(undefined),
    saveMember,
    resetChanges
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

  return { wrapper, saveMember, resetChanges, close, editor }
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

  test('button is disabled when has_name is false, even if dirty', () => {
    const { wrapper } = makeWrapper({ is_dirty: true, has_name: false })
    expect(wrapper.find('[data-testid="settings__save-button"]').attributes('data-disabled')).toBe(
      'true'
    )
  })
})

// ── Blank-name save guard ──────────────────────────────────────────────────────

describe('settings-save-button — blank-name save guard [obligation]', () => {
  test('sets name_error to the required-name copy when has_name is false', async () => {
    const { wrapper, editor } = makeWrapper({ is_dirty: true, has_name: false })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    expect(editor.name_error.value).toBe('Give your profile a name')
  })

  test('does not call saveMember when has_name is false', async () => {
    const { wrapper, saveMember } = makeWrapper({ is_dirty: true, has_name: false })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    expect(saveMember).not.toHaveBeenCalled()
  })

  test('does NOT show notice.error when has_name is false (regression: blank name used to fall through to saveMember)', async () => {
    const { wrapper } = makeWrapper({ is_dirty: true, has_name: false })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(mockNotice.error).not.toHaveBeenCalled()
  })
})

// ── Save and close ────────────────────────────────────────────────────────────

describe('settings-save-button — save behaviour [obligation]', () => {
  test('clicking save calls saveMember', async () => {
    const { wrapper, saveMember } = makeWrapper({ is_dirty: true })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    expect(saveMember).toHaveBeenCalledOnce()
  })

  test('calls close() after saveMember resolves "success" [obligation]', async () => {
    const { wrapper, close } = makeWrapper({ is_dirty: true, save_result: 'success' })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(close).toHaveBeenCalledOnce()
  })

  test('does NOT call close() when saveMember resolves "error" [obligation]', async () => {
    const { wrapper, close } = makeWrapper({ is_dirty: true, save_result: 'error' })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(close).not.toHaveBeenCalled()
  })

  test('shows settings.save-error notice when saveMember resolves "error" [obligation]', async () => {
    const { wrapper } = makeWrapper({ is_dirty: true, save_result: 'error' })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(mockNotice.error).toHaveBeenCalledWith("Couldn't save your changes. Please try again.")
  })

  test('does NOT show an error notice when saveMember resolves "success"', async () => {
    const { wrapper } = makeWrapper({ is_dirty: true, save_result: 'success' })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('does NOT call close() when saveMember resolves "duplicate-name" [obligation]', async () => {
    const { wrapper, close } = makeWrapper({ is_dirty: true, save_result: 'duplicate-name' })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(close).not.toHaveBeenCalled()
  })

  test('does NOT show the generic error notice when saveMember resolves "duplicate-name" [obligation]', async () => {
    const { wrapper } = makeWrapper({ is_dirty: true, save_result: 'duplicate-name' })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('sets name_error to the duplicate-name copy when saveMember resolves "duplicate-name" [obligation]', async () => {
    const { wrapper, editor } = makeWrapper({ is_dirty: true, save_result: 'duplicate-name' })
    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    await flushPromises()
    expect(editor.name_error.value).toBe("That name's already taken")
  })

  test('shows loading state while saveMember is in flight', async () => {
    let resolve
    const saveMember = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)))
    const close = vi.fn()
    const wrapper = mount(SettingsSaveButton, {
      global: {
        provide: {
          [memberEditorKey]: {
            is_dirty: ref(true),
            has_name: ref(true),
            name_error: ref(undefined),
            saveMember,
            resetChanges: vi.fn()
          },
          [settingsCloseKey]: close
        },
        stubs: { UiButton: UiButtonStub }
      }
    })

    await wrapper.find('[data-testid="settings__save-button"]').trigger('click')
    expect(wrapper.find('[data-testid="settings__save-button"]').attributes('data-loading')).toBe(
      'true'
    )

    resolve('success')
    await flushPromises()
    expect(wrapper.find('[data-testid="settings__save-button"]').attributes('data-loading')).toBe(
      'false'
    )
  })
})

// ── Reset button ────────────────────────────────────────────────────────────

describe('settings-save-button — reset button [obligation]', () => {
  test('is disabled when is_dirty is false [obligation]', () => {
    const { wrapper } = makeWrapper({ is_dirty: false })
    expect(wrapper.find('[data-testid="settings__reset-button"]').attributes('data-disabled')).toBe(
      'true'
    )
  })

  test('is not disabled when is_dirty is true [obligation]', () => {
    const { wrapper } = makeWrapper({ is_dirty: true })
    expect(wrapper.find('[data-testid="settings__reset-button"]').attributes('data-disabled')).toBe(
      'false'
    )
  })

  test('pressing it while disabled does NOT call resetChanges, only plays digi_powerdown [obligation]', async () => {
    const { wrapper, resetChanges } = makeWrapper({ is_dirty: false })

    await wrapper.find('[data-testid="settings__reset-button"]').trigger('click')

    expect(resetChanges).not.toHaveBeenCalled()
  })

  test('pressing it while enabled calls resetChanges [obligation]', async () => {
    const { wrapper, resetChanges } = makeWrapper({ is_dirty: true })

    await wrapper.find('[data-testid="settings__reset-button"]').trigger('click')

    expect(resetChanges).toHaveBeenCalledTimes(1)
  })
})
