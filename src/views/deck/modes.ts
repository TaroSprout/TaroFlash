import { computed, defineAsyncComponent, inject, type Component } from 'vue'
import CardGrid from './card-grid/scroll-grid.vue'
import { deckViewShellKey } from '@/composables/card-editor/deck-view-shell'

type DeckModeConfig = {
  pane: Component
  // page dots + prev/next nav stay interactive while this mode is active
  pagination: boolean
}

const loadCardEditor = () => import('./card-editor/index.vue')
const loadCardImporter = () => import('./card-importer.vue')

// Single source of truth for the deck view's modes. Adding a mode = write the
// pane component + one entry here; `satisfies` keeps the registry and the
// `CardEditorMode` union in sync both ways. The base `view` pane stays mounted
// across switches (it preserves grid scroll/pages), so it's imported eagerly;
// overlay panes lazy-load out of the deck view's chunk.
export const DECK_MODES = {
  view: {
    pane: CardGrid,
    pagination: true
  },
  edit: {
    pane: defineAsyncComponent(loadCardEditor),
    pagination: false
  },
  'import-export': {
    pane: defineAsyncComponent(loadCardImporter),
    pagination: false
  }
} satisfies Record<CardEditorMode, DeckModeConfig>

/**
 * Warm the lazy overlay chunks so the first mode switch animates immediately
 * instead of waiting on the network. Call once when the deck view mounts.
 */
export function preloadDeckModes() {
  loadCardEditor()
  loadCardImporter()
}

/**
 * Reactive config of the active mode for components inside the deck view
 * tree. Chrome reads its flags from here (e.g. `pagination`) instead of
 * comparing mode names, so new modes never touch existing components.
 */
export function useModeConfig() {
  const shell = inject(deckViewShellKey)!
  return computed<DeckModeConfig>(() => DECK_MODES[shell.mode.value])
}
