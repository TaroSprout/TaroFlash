<script lang="ts" setup>
import ItemOptions from './list-item-options.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import { cardEditorKey, type CardWithClientId } from '@/views/deck/composables'
import { inject, computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import ListItemCard from './list-item-card.vue'

type ListItemProps = {
  index: number
  card: CardWithClientId
  dragging?: boolean
}

const { card, index, dragging = false } = defineProps<ListItemProps>()

const emit = defineEmits<{ reorderPointerdown: [event: PointerEvent] }>()

const { t } = useI18n()
const { selection, actions, appendCard, prependCard } = inject(cardEditorKey)!
const { is_selecting, isCardSelected } = selection
const { onDeleteCards, onMoveCards, onSelectCard } = actions

const list_item_card = useTemplateRef('list-item-card')

const selected = computed(() => isCardSelected(card.id!))

function onClick(e: MouseEvent) {
  const closest = (selector: string) => !!(e.target as HTMLElement)?.closest(selector)

  if (is_selecting.value) {
    onSelectCard(card.id!)
    ;(document.activeElement as HTMLElement)?.blur?.()
    return
  }

  // Let a button handle its own click instead of stealing focus.
  if (closest('button')) {
    e.preventDefault()
    return
  }

  // Only a contenteditable is allowed to steal focus.
  if (!closest('[contenteditable]')) e.preventDefault()

  if (!list_item_card.value?.hasFocusWithin()) list_item_card.value?.focusEditor()
}
</script>

<template>
  <div
    data-testid="card-list-item"
    :data-id="card.id"
    :data-dragging="dragging"
    class="group/listitem relative grid w-full grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-6 place-items-center rounded-6 bg-transparent p-0 sm:p-6 transition-[color,background-color,box-shadow] duration-150 ease-in-out hover:not-focus-within:bg-raised-tint data-[dragging=true]:not-focus-within:bg-raised-tint data-[dragging=true]:shadow-sm"
    :class="{
      'cursor-pointer': is_selecting,
      'focus-within:bg-raised hover:focus-within:bg-raised': !is_selecting
    }"
    @mousedown="onClick"
  >
    <button
      data-testid="card-list-item__reorder"
      class="hidden h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full bg-raised text-lg text-ink sm:flex group-focus-within/listitem:bg-surface row-span-2"
      v-sfx="dragging ? {} : { hover: 'ui.hover' }"
      @click.stop
      @pointerdown="emit('reorderPointerdown', $event)"
    >
      <ui-icon
        src="reorder"
        class="hidden"
        :class="{
          'group-hover/listitem:block group-data-[dragging=true]/listitem:block': !is_selecting
        }"
      />
      <span
        :class="{
          'group-hover/listitem:hidden group-data-[dragging=true]/listitem:hidden': !is_selecting
        }"
      >
        {{ index + 1 }}
      </span>
    </button>

    <list-item-card ref="list-item-card" :card="card" />

    <item-options
      v-if="!is_selecting"
      class="hidden sm:grid opacity-0 pointer-events-none transition-opacity duration-100 ease-in-out group-hover/listitem:opacity-100 group-hover/listitem:pointer-events-auto group-data-[dragging=true]/listitem:opacity-0! group-data-[dragging=true]/listitem:pointer-events-none! group-focus-within/listitem:opacity-100 group-focus-within/listitem:pointer-events-auto row-span-2"
      @move="onMoveCards(card.id!)"
      @delete="onDeleteCards(card.id!)"
    />
    <ui-radio v-else :checked="selected" />

    <ui-button
      neutral
      v-if="!is_selecting"
      data-testid="card-list-item__add-above"
      icon-left="add"
      icon-only
      size="sm"
      class="absolute! z-1 top-0 -translate-y-1/2 opacity-0 pointer-events-none transition-opacity duration-100 ease-in-out group-hover/listitem:opacity-100 group-hover/listitem:pointer-events-auto group-data-[dragging=true]/listitem:opacity-0! group-data-[dragging=true]/listitem:pointer-events-none! group-focus-within/listitem:opacity-100 group-focus-within/listitem:pointer-events-auto *:[.btn-icon]:text-ink-muted"
      @click.stop="prependCard(card.id!)"
    >
      {{ t('deck-view.card-editor.list-item.add-above') }}
    </ui-button>
    <ui-button
      neutral
      v-if="!is_selecting"
      data-testid="card-list-item__add-below"
      icon-left="add"
      icon-only
      size="sm"
      class="absolute! z-1 bottom-0 translate-y-1/2 opacity-0 pointer-events-none transition-opacity duration-100 ease-in-out group-hover/listitem:opacity-100 group-hover/listitem:pointer-events-auto group-data-[dragging=true]/listitem:opacity-0! group-data-[dragging=true]/listitem:pointer-events-none! group-focus-within/listitem:opacity-100 group-focus-within/listitem:pointer-events-auto *:[.btn-icon]:text-ink-muted"
      @click.stop="appendCard(card.id!)"
    >
      {{ t('deck-view.card-editor.list-item.add-below') }}
    </ui-button>
  </div>
</template>
