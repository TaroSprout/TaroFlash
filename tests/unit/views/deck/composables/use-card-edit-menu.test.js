import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { config } from '@vue/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// useDeckQuery relies on @pinia/colada — mock the api module to decouple this test
// from the Pinia store lifecycle.
const { mockUseDeckQuery } = vi.hoisted(() => ({
  mockUseDeckQuery: vi.fn(() => ({ data: ref(null) }))
}))
vi.mock('@/api/decks', () => ({
  useDeckQuery: mockUseDeckQuery
}))

const { mockSettingsOpen } = vi.hoisted(() => ({ mockSettingsOpen: vi.fn() }))
vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => ({ open: mockSettingsOpen })
}))

const { mockUseMatchMedia } = vi.hoisted(() => ({ mockUseMatchMedia: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { useCardEditMenu } from '@/views/deck/composables/edit-menu'
import { cardEditorKey } from '@/views/deck/composables/list-controller'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function withSetup(composable, { provide } = {}) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  // Install globally configured plugins (i18n from setup.js) so useI18n() works
  for (const plugin of config.global.plugins ?? []) app.use(plugin)
  if (provide) {
    // Object.entries skips Symbol keys — iterate both string and Symbol keys
    const keys = [...Object.keys(provide), ...Object.getOwnPropertySymbols(provide)]
    for (const k of keys) app.provide(k, provide[k])
  }
  app.mount(document.createElement('div'))
  return [result, app]
}

function makeEditor({ deck_id = 1 } = {}) {
  return {
    deck_id,
    actions: { onSelectCard: vi.fn() }
  }
}

function makeShell({ mode = 'view', is_rearranging = false } = {}) {
  return {
    mode: ref(mode),
    is_rearranging: ref(is_rearranging),
    toggleMode: vi.fn(),
    toggleRearrange: vi.fn()
  }
}

function makeMobileEditor() {
  return { open_at: vi.fn() }
}

function setup({ editor, shell, mobile_editor, is_mobile = false } = {}) {
  mockUseMatchMedia.mockReturnValue(ref(is_mobile))
  const provide = {}
  if (editor !== undefined) provide[cardEditorKey] = editor
  if (shell !== undefined) provide[deckViewShellKey] = shell
  if (mobile_editor !== undefined) provide[mobileCardEditorKey] = mobile_editor

  const [result, app] = withSetup(() => useCardEditMenu(), { provide })
  return { result, app }
}

let app

beforeEach(() => {
  mockSettingsOpen.mockClear()
  mockUseDeckQuery.mockReturnValue({ data: ref(null) })
})

afterEach(() => {
  app?.unmount()
  app = null
})

// ── options shape ─────────────────────────────────────────────────────────────

describe('useCardEditMenu — options', () => {
  test('returns three options: select, rearrange, appearance', () => {
    ;({ app } = setup())
    // (app assigned above via destructuring — result unused here)
    const [result] = withSetup(() => useCardEditMenu())
    expect(result.options.value).toHaveLength(3)
    expect(result.options.value[0].value).toBe('select')
    expect(result.options.value[1].value).toBe('rearrange')
    expect(result.options.value[2].value).toBe('appearance')
    result // lint-happy
  })

  test('rearrange option has disabled:true exactly when is_rearranging [obligation]', () => {
    const shell = makeShell({ is_rearranging: true })
    const r = setup({ shell })
    app = r.app
    const rearrange_opt = r.result.options.value.find((o) => o.value === 'rearrange')
    expect(rearrange_opt.disabled).toBe(true)
  })

  test('rearrange option is NOT disabled when not rearranging [obligation]', () => {
    const shell = makeShell({ is_rearranging: false })
    const r = setup({ shell })
    app = r.app
    const rearrange_opt = r.result.options.value.find((o) => o.value === 'rearrange')
    expect(rearrange_opt.disabled).toBeFalsy()
  })

  test('is_rearranging computed reflects shell.is_rearranging', () => {
    const shell = makeShell({ is_rearranging: true })
    const r = setup({ shell })
    app = r.app
    expect(r.result.is_rearranging.value).toBe(true)
  })

  test('is_editing computed reflects shell.mode === edit', () => {
    const shell = makeShell({ mode: 'edit' })
    const r = setup({ shell })
    app = r.app
    expect(r.result.is_editing.value).toBe(true)
  })
})

// ── primaryAction [obligation] ────────────────────────────────────────────────

describe('useCardEditMenu — primaryAction [obligation]', () => {
  test('calls toggleRearrange when currently rearranging [obligation]', () => {
    const shell = makeShell({ is_rearranging: true })
    const r = setup({ shell, is_mobile: false })
    app = r.app
    r.result.primaryAction()
    expect(shell.toggleRearrange).toHaveBeenCalledOnce()
    expect(shell.toggleMode).not.toHaveBeenCalled()
  })

  test('calls startEditing (toggleMode) when not rearranging at md+ [obligation]', () => {
    const shell = makeShell({ is_rearranging: false })
    const r = setup({ shell, is_mobile: false })
    app = r.app
    r.result.primaryAction()
    expect(shell.toggleMode).toHaveBeenCalledWith('edit')
    expect(shell.toggleRearrange).not.toHaveBeenCalled()
  })

  test('calls startEditing (mobile_editor.open_at) when not rearranging below md [obligation]', () => {
    const shell = makeShell({ is_rearranging: false })
    const mobile_editor = makeMobileEditor()
    const r = setup({ shell, mobile_editor, is_mobile: true })
    app = r.app
    r.result.primaryAction()
    expect(mobile_editor.open_at).toHaveBeenCalledWith()
    expect(shell.toggleMode).not.toHaveBeenCalled()
  })
})

// ── startEditing [obligation] ─────────────────────────────────────────────────

describe('useCardEditMenu — startEditing [obligation]', () => {
  test('calls mobile_editor.open_at() with no args below md [obligation]', () => {
    const mobile_editor = makeMobileEditor()
    const shell = makeShell()
    const r = setup({ shell, mobile_editor, is_mobile: true })
    app = r.app
    r.result.startEditing()
    expect(mobile_editor.open_at).toHaveBeenCalledWith()
    expect(shell.toggleMode).not.toHaveBeenCalled()
  })

  test('calls shell.toggleMode("edit") at md+ [obligation]', () => {
    const shell = makeShell()
    const r = setup({ shell, is_mobile: false })
    app = r.app
    r.result.startEditing()
    expect(shell.toggleMode).toHaveBeenCalledWith('edit')
  })

  test('is a no-op when below md and no mobile_editor is provided', () => {
    const shell = makeShell()
    const r = setup({ shell, is_mobile: true }) // no mobile_editor
    app = r.app
    expect(() => r.result.startEditing()).not.toThrow()
    expect(shell.toggleMode).not.toHaveBeenCalled()
  })
})

// ── onSelect dispatch [obligation] ────────────────────────────────────────────

describe('useCardEditMenu — onSelect [obligation]', () => {
  test('onSelect({value:"select"}) calls editor.actions.onSelectCard', () => {
    const editor = makeEditor()
    const r = setup({ editor })
    app = r.app
    r.result.onSelect({ value: 'select' })
    expect(editor.actions.onSelectCard).toHaveBeenCalledOnce()
  })

  test('onSelect({value:"rearrange"}) calls shell.toggleRearrange', () => {
    const shell = makeShell()
    const r = setup({ shell })
    app = r.app
    r.result.onSelect({ value: 'rearrange' })
    expect(shell.toggleRearrange).toHaveBeenCalledOnce()
  })

  test('onSelect({value:"edit"}) calls startEditing (toggleMode at md+)', () => {
    const shell = makeShell()
    const r = setup({ shell, is_mobile: false })
    app = r.app
    r.result.onSelect({ value: 'edit' })
    expect(shell.toggleMode).toHaveBeenCalledWith('edit')
  })

  test('onSelect({value:"appearance"}) opens settings modal with the deck [obligation]', () => {
    const deck = { id: 5, title: 'Test Deck' }
    mockUseDeckQuery.mockReturnValue({ data: ref(deck) })
    const r = setup()
    app = r.app
    r.result.onSelect({ value: 'appearance' })
    expect(mockSettingsOpen).toHaveBeenCalledWith(deck, { tab: 'design', side: 'front' })
  })

  test('onSelect({value:"appearance"}) is a no-op when deck data is null', () => {
    mockUseDeckQuery.mockReturnValue({ data: ref(null) })
    const r = setup()
    app = r.app
    r.result.onSelect({ value: 'appearance' })
    expect(mockSettingsOpen).not.toHaveBeenCalled()
  })

  test('onSelect with unknown value is a no-op', () => {
    const editor = makeEditor()
    const shell = makeShell()
    const r = setup({ editor, shell })
    app = r.app
    expect(() => r.result.onSelect({ value: 'unknown' })).not.toThrow()
    expect(editor.actions.onSelectCard).not.toHaveBeenCalled()
    expect(shell.toggleRearrange).not.toHaveBeenCalled()
  })
})
