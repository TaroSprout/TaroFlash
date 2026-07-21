import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { config } from '@vue/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockUseMatchMedia } = vi.hoisted(() => ({ mockUseMatchMedia: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { useEditorSurface } from '@/views/deck/composables/editor-surface'
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
  for (const plugin of config.global.plugins ?? []) app.use(plugin)
  if (provide) {
    const keys = [...Object.keys(provide), ...Object.getOwnPropertySymbols(provide)]
    for (const k of keys) app.provide(k, provide[k])
  }
  app.mount(document.createElement('div'))
  return [result, app]
}

function makeEditor() {
  return { newCard: vi.fn() }
}

function makeShell() {
  return { toggleMode: vi.fn() }
}

function makeMobileEditor() {
  return { openNewCard: vi.fn(), open_at: vi.fn() }
}

/** Mount useEditorSurface at the given viewport with all three surfaces provided. */
function mountSurface({ is_mobile = false } = {}) {
  mockUseMatchMedia.mockReturnValue(ref(is_mobile))
  const editor = makeEditor()
  const shell = makeShell()
  const mobile_editor = makeMobileEditor()
  const [surface, app] = withSetup(() => useEditorSurface(), {
    provide: {
      [cardEditorKey]: editor,
      [deckViewShellKey]: shell,
      [mobileCardEditorKey]: mobile_editor
    }
  })
  return { surface, editor, shell, mobile_editor, app }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let active

afterEach(() => {
  active?.unmount()
  active = null
  vi.clearAllMocks()
})

beforeEach(() => {
  mockUseMatchMedia.mockReturnValue(ref(false))
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useEditorSurface', () => {
  test('keys off the "w<md" breakpoint token [obligation]', () => {
    const ctx = mountSurface()
    active = ctx.app
    expect(mockUseMatchMedia).toHaveBeenCalledWith('w<md')
  })

  // ── openNewCard ─────────────────────────────────────────────────────────────

  describe('openNewCard', () => {
    test('routes to the desktop editor at md+ [obligation]', () => {
      const ctx = mountSurface({ is_mobile: false })
      active = ctx.app
      ctx.surface.openNewCard()
      expect(ctx.editor.newCard).toHaveBeenCalledOnce()
      expect(ctx.mobile_editor.openNewCard).not.toHaveBeenCalled()
    })

    test('routes to the mobile dock editor below md [obligation]', () => {
      const ctx = mountSurface({ is_mobile: true })
      active = ctx.app
      ctx.surface.openNewCard()
      expect(ctx.mobile_editor.openNewCard).toHaveBeenCalledOnce()
      expect(ctx.editor.newCard).not.toHaveBeenCalled()
    })
  })

  // ── startEditing ────────────────────────────────────────────────────────────

  describe('startEditing', () => {
    test('toggles desktop edit mode at md+ [obligation]', () => {
      const ctx = mountSurface({ is_mobile: false })
      active = ctx.app
      ctx.surface.startEditing()
      expect(ctx.shell.toggleMode).toHaveBeenCalledWith('edit')
      expect(ctx.mobile_editor.open_at).not.toHaveBeenCalled()
    })

    test('opens the dock editor below md [obligation]', () => {
      const ctx = mountSurface({ is_mobile: true })
      active = ctx.app
      ctx.surface.startEditing()
      expect(ctx.mobile_editor.open_at).toHaveBeenCalledOnce()
      expect(ctx.shell.toggleMode).not.toHaveBeenCalled()
    })
  })

  // ── openCard ────────────────────────────────────────────────────────────────

  describe('openCard', () => {
    test('returns false and does not open the dock at md+ [obligation]', () => {
      const ctx = mountSurface({ is_mobile: false })
      active = ctx.app
      expect(ctx.surface.openCard('c1')).toBe(false)
      expect(ctx.mobile_editor.open_at).not.toHaveBeenCalled()
    })

    test('opens the dock on the given card and returns true below md [obligation]', () => {
      const ctx = mountSurface({ is_mobile: true })
      active = ctx.app
      expect(ctx.surface.openCard('c1')).toBe(true)
      expect(ctx.mobile_editor.open_at).toHaveBeenCalledWith('c1')
    })
  })
})
