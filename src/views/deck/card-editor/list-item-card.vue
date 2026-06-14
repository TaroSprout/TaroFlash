<script setup lang="ts">
import CardFaceUploader from './card-face-uploader.vue'
import { useI18n } from 'vue-i18n'
import { inject, onMounted, ref, useTemplateRef } from 'vue'
import { cardEditorKey } from '@/composables/card/list-controller'
import type { CardWithClientId } from '@/composables/card/virtual-list'
import textEditor from '@/components/card/text-editor.vue'
import { emitSfx } from '@/sfx/bus'
import { useWindowRefocusGuard } from '@/composables/ui/window-refocus-guard'
import { expandListItemIn } from '@/utils/animations/list-item'

type ListItemCardProps = {
  card: CardWithClientId
}

const { card } = defineProps<ListItemCardProps>()

const { t } = useI18n()
const list_item_card = useTemplateRef('list-item-card')
const front_input = useTemplateRef('front-input')

const focused = ref(false)

// Local editor state is the source of truth while the component is mounted.
// Initialised from the card prop; later cache updates are ignored so
// incoming refetches can't clobber what the user has typed.
const front_text = ref(card.front_text ?? '')
const back_text = ref(card.back_text ?? '')
const save_failed = ref(false)

const { selection, updateCard, card_attributes, claimFocus } = inject(cardEditorKey)!
const { is_selecting } = selection

const { flagWindowBlur, consumeWindowRefocus } = useWindowRefocusGuard()

// A card staged by the toolbar's "new card" intent claims its one-shot signal
// the moment its row mounts: land the user in the front editor ready to type,
// and reveal the new row with a grow-in (gated here so scroll-mounted rows
// don't animate).
onMounted(() => {
  if (!claimFocus(card.client_id)) return

  focusEditor()
  if (list_item_card.value) expandListItemIn(list_item_card.value)
})

// Persist both sides from local state, not just the edited one: the merge base
// in the save path is the cached card, so sending a single side would let it
// clobber the other side with stale cache data. Local refs are the source of
// truth while mounted, so they carry the complete, current card.
async function onUpdate(side: 'front' | 'back', text: string) {
  if (side === 'front') front_text.value = text
  else back_text.value = text

  save_failed.value = false

  try {
    await updateCard(card.id, { front_text: front_text.value, back_text: back_text.value })
  } catch {
    save_failed.value = true
  }
}

function focusEditor() {
  if (!focused.value) {
    front_input.value?.focus()
  }
}

// Whether a node lives inside any card in the editor (its own card or another).
// Lets us tell "focus moved between cards" from "focus entered/left the editor".
function withinAnyCard(node: EventTarget | null) {
  return (node as HTMLElement | null)?.closest?.('[data-testid="list-item-card"]') != null
}

// Gate the sfx on contenteditable focus so the image button doesn't trigger it.
// Arriving from another card (or the other side) clicks; arriving from outside
// every card — i.e. activating a card when none was — slides up.
function onFocusIn(e: FocusEvent) {
  if (!(e.target as HTMLElement | null)?.isContentEditable) return

  // The browser restoring focus after the window comes back isn't a user
  // action — stay silent, but still track that we hold focus again.
  if (consumeWindowRefocus()) {
    focused.value = true
    return
  }

  emitSfx(withinAnyCard(e.relatedTarget) ? 'ui.click_04' : 'ui.slide_up')
  focused.value = true
}

// When an editor blurs to outside every card, the active card was deselected
// with nothing new picked up — drop it.
function onFocusOut(e: FocusEvent) {
  focused.value = list_item_card.value?.contains(e.relatedTarget as Node | null) ?? false

  const left_editor = (e.target as HTMLElement | null)?.isContentEditable ?? false
  if (!left_editor) return

  // A window blur (switching apps) blurs the editor without the user choosing
  // to — flag the round-trip so the matching refocus stays silent, no drop.
  if (!document.hasFocus()) return flagWindowBlur()

  if (!withinAnyCard(e.relatedTarget)) emitSfx('ui.card_drop')
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
    class="flex w-full flex-col justify-center gap-6 md:flex-row"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <card-face-uploader
      data-testid="front-input"
      :data-id="card.id"
      :card="card"
      side="front"
      :disabled="is_selecting"
      :error="save_failed"
    >
      <template #editor>
        <text-editor
          ref="front-input"
          :content="front_text"
          :attributes="card_attributes.front"
          :placeholder="t('deck-view.card-editor.list-item.front-placeholder')"
          class="w-full h-full"
          @update="onUpdate('front', $event)"
        />
      </template>
    </card-face-uploader>

    <card-face-uploader
      data-testid="back-input"
      :data-id="card.id"
      :card="card"
      side="back"
      :disabled="is_selecting"
      :error="save_failed"
    >
      <template #editor>
        <text-editor
          ref="back-input"
          :content="back_text"
          :attributes="card_attributes.back"
          :placeholder="t('deck-view.card-editor.list-item.back-placeholder')"
          class="w-full h-full"
          @update="onUpdate('back', $event)"
        />
      </template>
    </card-face-uploader>
  </div>
</template>
