// Deck-view card-editor orchestration. Colocated with the deck view because
// it's consumed only by views/deck/** (card-editor, card-grid, mode-toolbar,
// deck-hero). For reusable, feature-neutral card primitives (mutations,
// selection, prompts, gates, image upload) import from `@/composables/card`.

export { useCardListController, cardEditorKey, type CardListController } from './list-controller'
export { useCardSearch, cardSearchKey, type CardSearch } from './card-search'
export { useCardEditMenu, type CardEditMenu } from './edit-menu'
export { useCardActions, type CardActions } from './actions'
export { useBulkActions } from './bulk-actions'
export {
  useVirtualCardList,
  type VirtualCardList,
  type CardWithClientId,
  type CardEntry
} from './virtual-list'
