import { describe, test, expect, afterEach, vi } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { DECK_MODES, preloadDeckModes, useModeConfig } from '@/views/deck/modes'
import { deckViewShellKey } from '@/composables/card-editor/deck-view-shell'

// Lazy pane imports inside DECK_MODES use defineAsyncComponent — mock them so
// the test environment doesn't need the full component graphs.
vi.mock('@/views/deck/card-grid/scroll-grid.vue', () => ({
  default: { name: 'CardGrid' }
}))
vi.mock('@/views/deck/card-editor/index.vue', () => ({
  default: { name: 'CardEditor' }
}))
vi.mock('@/views/deck/card-importer.vue', () => ({
  default: { name: 'CardImporter' }
}))

function withSetup(composable, provide_pairs = []) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  provide_pairs.forEach(([k, v]) => app.provide(k, v))
  app.mount(document.createElement('div'))
  return [result, app]
}

let app

afterEach(() => {
  app?.unmount()
  app = undefined
})

describe('DECK_MODES registry', () => {
  test('defines entries for view, edit, and import-export modes', () => {
    expect(DECK_MODES).toHaveProperty('view')
    expect(DECK_MODES).toHaveProperty('edit')
    expect(DECK_MODES).toHaveProperty('import-export')
  })

  test('only view mode has pagination enabled', () => {
    expect(DECK_MODES.view.pagination).toBe(true)
    expect(DECK_MODES.edit.pagination).toBe(false)
    expect(DECK_MODES['import-export'].pagination).toBe(false)
  })

  test('each mode has a pane component', () => {
    for (const config of Object.values(DECK_MODES)) {
      expect(config.pane).toBeDefined()
    }
  })
})

describe('preloadDeckModes', () => {
  test('is callable without throwing', () => {
    expect(() => preloadDeckModes()).not.toThrow()
  })
})

describe('useModeConfig', () => {
  test('returns config for view mode when shell is in view mode', () => {
    const shell = { mode: ref('view') }
    let config
    ;[config, app] = withSetup(() => useModeConfig(), [[deckViewShellKey, shell]])
    expect(config.value.pagination).toBe(true)
  })

  test('returns config for edit mode when shell is in edit mode', () => {
    const shell = { mode: ref('edit') }
    let config
    ;[config, app] = withSetup(() => useModeConfig(), [[deckViewShellKey, shell]])
    expect(config.value.pagination).toBe(false)
  })

  test('returns config for import-export mode when shell is in import-export mode', () => {
    const shell = { mode: ref('import-export') }
    let config
    ;[config, app] = withSetup(() => useModeConfig(), [[deckViewShellKey, shell]])
    expect(config.value.pagination).toBe(false)
  })

  test('config updates reactively when shell mode changes', async () => {
    const shell = { mode: ref('view') }
    let config
    ;[config, app] = withSetup(() => useModeConfig(), [[deckViewShellKey, shell]])
    expect(config.value.pagination).toBe(true)

    shell.mode.value = 'edit'
    await Promise.resolve()

    expect(config.value.pagination).toBe(false)
  })
})
