<script lang="ts" setup>
import ItemOptions from './list-item-options.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import { cardEditorKey, type CardWithClientId } from '@/views/deck/composables'
import { inject, computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import ListItemCard from './list-item-card.vue'
import { TYPE_SFX } from '@/sfx/config'

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

  // If the click is on a button, let the button handle it
  // Prevent default to avoid stealing focus state
  if (closest('button')) {
    e.preventDefault()
    return
  }

  // If the click IS NOT on an input, prevent default to avoid stealing focus state
  // If the click IS on an input, we expect it to steal focus and don't want to prevent that here
  if (!closest('[contenteditable]')) e.preventDefault()

  // focus the card's front-text editor if the card doesn't already have focus
  if (!list_item_card.value?.hasFocusWithin()) list_item_card.value?.focusEditor()
}
</script>

<template>
  <div
    data-testid="card-list-item"
    :data-id="card.id"
    :data-dragging="dragging"
    class="group/listitem relative grid w-full grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-6 place-items-center rounded-6 bg-transparent p-0 sm:p-6 transition-[color,background-color,box-shadow] duration-150 ease-in-out hover:not-focus-within:bg-brown-200 dark:hover:not-focus-within:bg-stone-900 data-[dragging=true]:not-focus-within:bg-brown-200 dark:data-[dragging=true]:not-focus-within:bg-stone-900 data-[dragging=true]:shadow-sm"
    :class="{
      'cursor-pointer': is_selecting,
      'focus-within:bg-brown-300 hover:focus-within:bg-brown-300 dark:focus-within:bg-blue-650 dark:hover:focus-within:bg-blue-650':
        !is_selecting
    }"
    @mousedown="onClick"
  >
    <button
      data-testid="card-list-item__reorder"
      class="hidden h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full bg-brown-300 text-lg text-brown-700 sm:flex group-focus-within/listitem:bg-brown-100 row-span-2 dark:bg-stone-700 dark:text-brown-100 dark:group-focus-within/listitem:bg-stone-900"
      v-sfx="dragging ? {} : { hover: TYPE_SFX }"
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
      v-if="!is_selecting"
      data-testid="card-list-item__add-above"
      icon-left="add"
      icon-only
      data-theme="brown-100"
      data-theme-dark="grey-900"
      size="sm"
      class="absolute! z-1 top-0 -translate-y-1/2 opacity-0 pointer-events-none transition-opacity duration-100 ease-in-out group-hover/listitem:opacity-100 group-hover/listitem:pointer-events-auto group-data-[dragging=true]/listitem:opacity-0! group-data-[dragging=true]/listitem:pointer-events-none! group-focus-within/listitem:opacity-100 group-focus-within/listitem:pointer-events-auto *:[.btn-icon]:text-ink-muted"
      @click.stop="prependCard(card.id!)"
    >
      {{ t('deck-view.card-editor.list-item.add-above') }}
    </ui-button>
    <ui-button
      v-if="!is_selecting"
      data-testid="card-list-item__add-below"
      icon-left="add"
      icon-only
      data-theme="brown-100"
      data-theme-dark="grey-900"
      size="sm"
      class="absolute! z-1 bottom-0 translate-y-1/2 opacity-0 pointer-events-none transition-opacity duration-100 ease-in-out group-hover/listitem:opacity-100 group-hover/listitem:pointer-events-auto group-data-[dragging=true]/listitem:opacity-0! group-data-[dragging=true]/listitem:pointer-events-none! group-focus-within/listitem:opacity-100 group-focus-within/listitem:pointer-events-auto *:[.btn-icon]:text-ink-muted"
      @click.stop="appendCard(card.id!)"
    >
      {{ t('deck-view.card-editor.list-item.add-below') }}
    </ui-button>
  </div>
</template>
