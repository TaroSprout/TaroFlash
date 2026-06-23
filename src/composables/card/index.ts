// Reusable, feature-neutral card primitives. Any feature (deck editor, study
// session, audio reader) imports from `@/composables/card`. Never reach into
// individual modules by deep path. `useCardMutations` is the single sanctioned
// seam for card writes.
//
// Deck-editor-specific orchestration (the cardEditorKey controller, actions,
// bulk-actions, virtual-list) is colocated with its view in
// `@/views/deck/composables` — not here.

export { useCardMutations, type CardMutations } from './mutations'
export { useCardSelection, type CardSelection } from './selection'
export { useCardPrompts } from './prompts'
export { useFaceImageUpload, CARD_IMAGE_MAX_BYTES } from './face-image-upload'
export { useImageDropzone, type ImageFileError } from './image-dropzone'
export { useCardImageGate } from './image-gate'
export { useCardLimitGate } from './limit-gate'
