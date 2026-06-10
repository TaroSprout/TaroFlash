import { defineAsyncComponent, type Component } from 'vue'
import CardGrid from './card-grid/scroll-grid.vue'

type DeckModeConfig = {
  pane: Component
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
    pane: CardGrid
  },
  edit: {
    pane: defineAsyncComponent(loadCardEditor)
  },
  'import-export': {
    pane: defineAsyncComponent(loadCardImporter)
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
