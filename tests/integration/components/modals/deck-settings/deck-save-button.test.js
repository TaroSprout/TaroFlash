import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import DeckSaveButton from '@/components/modals/deck-settings/deck-save-button.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsCloseKey } from '@/components/modals/deck-settings/layout'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: Boolean, disabled: Boolean },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'deck-settings__save-button',
          'data-loading': String(!!props.loading),
          'data-disabled': String(!!props.disabled),
          onClick: () => emit('click')
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

describe('DeckSaveButton — not dirty plays woodblock only when title is empty first check', () => {
  test('not-dirty check fires before empty-title check', async () => {
    // When not dirty AND title is empty: digi_powerdown fires (not woodblock)
    const { wrapper } = makeSaveButton({ title: '', is_dirty: false })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
    expect(mockEmitSfx).not.toHaveBeenCalledWith('etc_woodblock_stuck')
  })
})
