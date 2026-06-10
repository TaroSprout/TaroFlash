import { describe, test, expect, vi } from 'vite-plus/test'
import { DECK_MODES, preloadDeckModes } from '@/views/deck/modes'

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

describe('DECK_MODES registry', () => {
  test('defines entries for view, edit, and import-export modes', () => {
    expect(DECK_MODES).toHaveProperty('view')
    expect(DECK_MODES).toHaveProperty('edit')
    expect(DECK_MODES).toHaveProperty('import-export')
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
