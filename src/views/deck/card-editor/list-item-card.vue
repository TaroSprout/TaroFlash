<script setup lang="ts">
import Card from '@/components/card/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { inject, ref, useTemplateRef } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'
import textEditor from '@/components/text-editor/text-editor.vue'
import { emitSfx } from '@/sfx/bus'

type ListItemCardProps = {
  card: Card
  duplicate: boolean
}

const { card } = defineProps<ListItemCardProps>()

const emit = defineEmits<{
  (e: 'delete-image', side: 'front' | 'back'): void
}>()

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

const { selection, updateCard, card_attributes } = inject<CardListController>('card-editor')!
const { is_selecting } = selection

async function onUpdate(side: 'front' | 'back', text: string) {
  if (side === 'front') front_text.value = text
  else back_text.value = text

  save_failed.value = false

  try {
    await updateCard(card.id, { [`${side}_text`]: text })
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

  emitSfx(withinAnyCard(e.relatedTarget) ? 'ui.click_04' : 'ui.slide_up')
  focused.value = true
}

// When an editor blurs to outside every card, the active card was deselected
// with nothing new picked up — drop it.
function onFocusOut(e: FocusEvent) {
  focused.value = list_item_card.value?.contains(e.relatedTarget as Node | null) ?? false

  const left_editor = (e.target as HTMLElement | null)?.isContentEditable ?? false
  if (left_editor && !withinAnyCard(e.relatedTarget)) emitSfx('ui.card_drop')
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
    <card
      data-testid="front-input"
      :data-id="card.id"
      side="front"
      size="xl"
      mode="edit"
      v-bind="card"
      :error="save_failed"
      class="group/card"
      :class="{ 'pointer-events-none': is_selecting }"
    >
      <ui-button
        v-if="card.front_image_path && !is_selecting"
        data-testid="list-item-card__delete-front-image"
        icon-only
        icon-left="delete"
        data-theme="red-500"
        class="absolute! -top-1 -right-1 z-10"
        @click.stop="emit('delete-image', 'front')"
      >
        {{ t('deck-view.card-editor.list-item.remove-image-button') }}
      </ui-button>

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
    </card>

    <card
      data-testid="back-input"
      :data-id="card.id"
      side="back"
      size="xl"
      mode="edit"
      v-bind="card"
      :error="save_failed"
      class="group/card"
      :class="{ 'pointer-events-none': is_selecting }"
    >
      <ui-button
        v-if="card.back_image_path && !is_selecting"
        data-testid="list-item-card__delete-back-image"
        icon-only
        icon-left="delete"
        data-theme="red-500"
        class="absolute! -top-1 -right-1 z-10"
        @click.stop="emit('delete-image', 'back')"
      >
        {{ t('deck-view.card-editor.list-item.remove-image-button') }}
      </ui-button>

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
    </card>
  </div>
</template>
