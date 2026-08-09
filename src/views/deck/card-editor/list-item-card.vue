<script setup lang="ts">
import FaceEditor from '@/components/card/face-editor.vue'
import { useI18n } from 'vue-i18n'
import { inject, onMounted, ref, useTemplateRef } from 'vue'
import { cardEditorKey, type CardWithClientId } from '@/views/deck/composables'
import { emitSfx } from '@/sfx/bus'
import { useWindowRefocusGuard } from '@/composables/ui/window-refocus-guard'
import { expandListItemIn } from '@/utils/animations/list-item'
import { useNoticeStore } from '@/stores/notice-store'

type ListItemCardProps = {
  card: CardWithClientId
}

const { card } = defineProps<ListItemCardProps>()

const { t } = useI18n()
const notice = useNoticeStore()
const list_item_card = useTemplateRef('list-item-card')
const front_input = useTemplateRef('front-input')

const focused = ref(false)

// Source of truth while mounted — later cache updates are ignored so a
// refetch can't clobber what the user has typed.
const front_text = ref(card.front_text ?? '')
const back_text = ref(card.back_text ?? '')
const save_failed = ref(false)

const { selection, updateCard, card_attributes, claimFocus, claimGrow } = inject(cardEditorKey)!
const { is_selecting } = selection

const { flagWindowBlur, consumeWindowRefocus } = useWindowRefocusGuard()

// Claims its two one-shot signals on mount: focus (front editor) and grow-in
// (height reveal). Both are gated so an ordinary scroll-mounted row fires
// neither. →[K:deck-editor-focus-claim]
onMounted(() => {
  if (claimFocus(card.client_id)) focusEditor()
  if (claimGrow(card.client_id) && list_item_card.value) expandListItemIn(list_item_card.value)
})

// Sends both sides, not just the edited one — the save path's merge base is
// the cached card, so a single side would let it clobber the other with stale data.
async function onUpdate(side: 'front' | 'back', text: string) {
  if (side === 'front') front_text.value = text
  else back_text.value = text

  save_failed.value = false

  try {
    await updateCard(card.id, { front_text: front_text.value, back_text: back_text.value })
  } catch {
    save_failed.value = true
    notice.error(t('toast.error.card-save-failed'))
  }
}

// Flags a programmatic autofocus so onFocusIn stays silent — the add action
// owns that sound. Cleared on the next microtask in case focus() no-ops.
let programmatic_focus = false
function focusEditor() {
  if (focused.value) return
  programmatic_focus = true
  front_input.value?.focus()
  queueMicrotask(() => (programmatic_focus = false))
}

/** Whether a node lives inside any card in the editor, to tell "moved between cards" from "left the editor". */
function withinAnyCard(node: EventTarget | null) {
  return (node as HTMLElement | null)?.closest?.('[data-testid="list-item-card"]') != null
}

// Gated on contenteditable focus so the image button doesn't trigger it.
function onFocusIn(e: FocusEvent) {
  if (!(e.target as HTMLElement | null)?.isContentEditable) return

  // A window-refocus isn't a user action — stay silent.
  if (consumeWindowRefocus()) {
    focused.value = true
    return
  }

  // Programmatic autofocus isn't a user landing on the card either.
  if (programmatic_focus) {
    programmatic_focus = false
    focused.value = true
    return
  }

  emitSfx(withinAnyCard(e.relatedTarget) ? 'click_04' : 'slide_up')
  focused.value = true
}

function onFocusOut(e: FocusEvent) {
  focused.value = list_item_card.value?.contains(e.relatedTarget as Node | null) ?? false

  const left_editor = (e.target as HTMLElement | null)?.isContentEditable ?? false
  if (!left_editor) return

  // A window blur isn't the user leaving the card — flag the round-trip so the matching refocus stays silent.
  if (!document.hasFocus()) return flagWindowBlur()

  if (!withinAnyCard(e.relatedTarget)) emitSfx('card_drop')
}

function hasFocusWithin() {
  return list_item_card.value?.contains(document.activeElement) ?? false
}

defineExpose({ focusEditor, hasFocusWithin })
</script>

<template>
  <div
    ref="list-item-card"
    data-testid="list-item-card"
    :data-client-id="card.client_id"
    class="flex w-full flex-col justify-center gap-6 md:flex-row"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <face-editor
      ref="front-input"
      data-testid="front-input"
      class="w-(--card-w-full)"
      :data-id="card.id"
      :card="card"
      side="front"
      with_images
      :card_attributes="card_attributes"
      :text="front_text"
      :card_key="card.client_id"
      :disabled="is_selecting"
      :error="save_failed"
      :placeholder="t('deck-view.card-editor.list-item.front-placeholder')"
      @update="onUpdate"
    />

    <face-editor
      data-testid="back-input"
      class="w-(--card-w-full)"
      :data-id="card.id"
      :card="card"
      side="back"
      with_images
      :card_attributes="card_attributes"
      :text="back_text"
      :card_key="card.client_id"
      :disabled="is_selecting"
      :error="save_failed"
      :placeholder="t('deck-view.card-editor.list-item.back-placeholder')"
      @update="onUpdate"
    />
  </div>
</template>
