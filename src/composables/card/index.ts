// Public surface of the card composable domain. Consumers import from
// `@/composables/card` — never reach into individual modules by deep path.
// `useCardMutations` is the single sanctioned seam for card writes; every
// card-write call site (deck editor, study session, audio reader) routes
// through this domain.

export { useCardListController, cardEditorKey, type CardListController } from './list-controller'
export { useCardMutations, type CardMutations } from './mutations'
export { useCardSelection, type CardSelection } from './selection'
export {
  useVirtualCardList,
  type VirtualCardList,
  type CardWithClientId,
  type CardEntry
} from './virtual-list'
export { useCardActions, type CardActions } from './actions'
export { useBulkActions } from './bulk-actions'
export { useFaceImageUpload, CARD_IMAGE_MAX_BYTES } from './face-image-upload'
export { useImageDropzone, type ImageFileError } from './image-dropzone'
export { useCardImageGate } from './image-gate'
export { useCardLimitGate } from './limit-gate'
