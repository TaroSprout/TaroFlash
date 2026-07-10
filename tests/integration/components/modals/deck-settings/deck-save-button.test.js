import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref, computed } from 'vue'
import DeckSaveButton from '@/views/deck/deck-settings/deck-save-button.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsCloseKey } from '@/views/deck/deck-settings/layout'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: Boolean, disabled: Boolean },
  emits: ['press'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'deck-settings__save-button',
          'data-loading': String(!!props.loading),
          'data-disabled': String(!!props.disabled),
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeSaveButton({ title = 'My Deck', is_dirty = true } = {}) {
  const settings = reactive({ title })
  const saveDeck = vi.fn().mockResolvedValue(true)
  const close = vi.fn()

  const editor = {
    settings,
    is_dirty: ref(is_dirty),
    has_title: computed(() => !!settings.title?.trim()),
    title_error: ref(undefined),
    saveDeck
  }

  const wrapper = mount(DeckSaveButton, {
    global: {
      provide: {
        [deckEditorKey]: editor,
        [deckSettingsCloseKey]: close
      },
      stubs: { UiButton: UiButtonStub }
    }
  })

  return { wrapper, editor, settings, saveDeck, close }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockNotice.error.mockClear()
})

describe('DeckSaveButton — not dirty', () => {
  test('plays digi_powerdown when deck is not dirty', async () => {
    const { wrapper } = makeSaveButton({ is_dirty: false })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
  })

  test('does not call saveDeck when not dirty', async () => {
    const { wrapper, saveDeck } = makeSaveButton({ is_dirty: false })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(saveDeck).not.toHaveBeenCalled()
  })

  test('does not close when not dirty', async () => {
    const { wrapper, close } = makeSaveButton({ is_dirty: false })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
  })
})

describe('DeckSaveButton — empty title', () => {
  test('plays etc_woodblock_stuck when title is empty (is_dirty=true)', async () => {
    const { wrapper } = makeSaveButton({ title: '', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })

  test('plays etc_woodblock_stuck when title is whitespace-only', async () => {
    const { wrapper } = makeSaveButton({ title: '   ', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })

  test('does not call saveDeck when title is empty', async () => {
    const { wrapper, saveDeck } = makeSaveButton({ title: '', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(saveDeck).not.toHaveBeenCalled()
  })

  test('sets title_error to the required-title copy when title is empty [obligation]', async () => {
    const { wrapper, editor } = makeSaveButton({ title: '', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(editor.title_error.value).toBe('Give your deck a name')
  })

  test('does NOT show an error notice when title is empty (blank-title path) [obligation]', async () => {
    const { wrapper } = makeSaveButton({ title: '', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await flushPromises()

    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('does not close when title is empty', async () => {
    const { wrapper, close } = makeSaveButton({ title: '', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
  })
})

describe('DeckSaveButton — disabled state [obligation]', () => {
  test('disabled when not dirty', () => {
    const { wrapper } = makeSaveButton({ is_dirty: false })
    expect(
      wrapper.find('[data-testid="deck-settings__save-button"]').attributes('data-disabled')
    ).toBe('true')
  })

  test('disabled when title is blank, even if dirty', () => {
    const { wrapper } = makeSaveButton({ title: '', is_dirty: true })
    expect(
      wrapper.find('[data-testid="deck-settings__save-button"]').attributes('data-disabled')
    ).toBe('true')
  })

  test('not disabled when dirty and title is non-empty', () => {
    const { wrapper } = makeSaveButton({ title: 'My Deck', is_dirty: true })
    expect(
      wrapper.find('[data-testid="deck-settings__save-button"]').attributes('data-disabled')
    ).toBe('false')
  })
})

describe('DeckSaveButton — dirty with valid title', () => {
  test('calls saveDeck when dirty and title is non-empty', async () => {
    const { wrapper, saveDeck } = makeSaveButton({ title: 'My Deck', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await flushPromises()

    expect(saveDeck).toHaveBeenCalledTimes(1)
  })

  test('closes with true when saveDeck resolves true', async () => {
    const { wrapper, close } = makeSaveButton({ title: 'My Deck', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await flushPromises()

    expect(close).toHaveBeenCalledWith(true)
  })

  test('does not close when saveDeck resolves false', async () => {
    const { wrapper, saveDeck, close } = makeSaveButton({ title: 'My Deck', is_dirty: true })
    saveDeck.mockResolvedValue(false)

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
  })

  test('shows an error notice when saveDeck resolves false [obligation]', async () => {
    const { wrapper, saveDeck } = makeSaveButton({ title: 'My Deck', is_dirty: true })
    saveDeck.mockResolvedValue(false)

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await flushPromises()

    expect(mockNotice.error).toHaveBeenCalledWith("Couldn't save this deck. Please try again.")
  })

  test('does NOT show an error notice when saveDeck resolves true', async () => {
    const { wrapper } = makeSaveButton({ title: 'My Deck', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await flushPromises()

    expect(mockNotice.error).not.toHaveBeenCalled()
  })
})

describe('DeckSaveButton — loading state', () => {
  test('sets loading=true while saveDeck is in flight', async () => {
    let resolve
    const { wrapper, saveDeck } = makeSaveButton({ title: 'My Deck', is_dirty: true })
    saveDeck.mockImplementation(() => new Promise((r) => (resolve = r)))

    // Trigger click but do NOT await — onSave is async, we want to inspect
    // state mid-flight. nextTick lets Vue flush the is_saving=true assignment.
    wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await nextTick()

    expect(
      wrapper.find('[data-testid="deck-settings__save-button"]').attributes('data-loading')
    ).toBe('true')

    resolve(true)
    await flushPromises()
  })

  test('resets loading=false after saveDeck resolves', async () => {
    const { wrapper } = makeSaveButton({ title: 'My Deck', is_dirty: true })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')
    await flushPromises()

    expect(
      wrapper.find('[data-testid="deck-settings__save-button"]').attributes('data-loading')
    ).toBe('false')
  })
})

describe('DeckSaveButton — empty-title check fires before not-dirty check [obligation]', () => {
  test('when not dirty AND title is empty: etc_woodblock_stuck fires (title check runs first)', async () => {
    const { wrapper } = makeSaveButton({ title: '', is_dirty: false })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    expect(mockEmitSfx).not.toHaveBeenCalledWith('digi_powerdown')
  })
})
