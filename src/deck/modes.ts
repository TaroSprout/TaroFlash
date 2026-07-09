import type { Component } from 'vue'
import CardGrid from './card-grid/scroll-grid.vue'
import CardEditor from './card-editor/index.vue'
import CardImporter from './card-importer.vue'

type DeckModeConfig = {
  pane: Component
}

// Single source of truth for the deck view's modes. Adding a mode = write the
// pane component + one entry here; `satisfies` keeps the registry and the
// `CardEditorMode` union in sync both ways. All panes bundle into the deck
// view's own route chunk.
export const DECK_MODES = {
  view: {
    pane: CardGrid
  },
  edit: {
    pane: CardEditor
  },
  'import-export': {
    pane: CardImporter
  }
} satisfies Record<CardEditorMode, DeckModeConfig>
