<script setup lang="ts">
import ListItem from './list-item.vue'
import { CARD_LIST_ROW_PITCH } from './row-pitch'
import {
  inject,
  useTemplateRef,
  computed,
  watch,
  watchEffect,
  onMounted,
  onBeforeUnmount
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useWindowVirtualizer, defaultRangeExtractor } from '@tanstack/vue-virtual'
import { cardEditorKey } from '@/views/deck/composables'
import { usePinScrollWhileTyping } from '@/composables/ui/pin-scroll-while-typing'
import { useParentScrollMargin } from '@/composables/ui/parent-scroll-margin'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useReorderDrag } from '@/composables/use-reorder-drag'
import { liftListItem, dropListItem } from '@/utils/animations/list-item'

const { t } = useI18n()

const LOAD_MORE_THRESHOLD = 5
const OVERSCAN = 3

const {
  list,
  selection,
  reorderCard,
  can_reorder,
  hasNextPage,
  isLoading,
  loadNextPage,
  registerScroller
} = inject(cardEditorKey)!
const { all_cards } = list

const list_el = useTemplateRef<HTMLElement>('list_el')
const is_above_md = useMatchMedia('w>=md')

const { scroll_margin } = useParentScrollMargin(list_el, {
  onMeasure: () => virtualizer.value.measure()
})

usePinScrollWhileTyping(() => list_el.value)

const reorder = useReorderDrag({
  pitch: CARD_LIST_ROW_PITCH,
  count: () => all_cards.value.length,
  enabled: () => is_above_md.value && !selection.is_selecting.value && can_reorder.value,
  topInset: () => sticky_toolbar?.getBoundingClientRect().bottom ?? 0,
  // Grows as infinite-scroll loads more rows mid-drag, so auto-scroll past the load threshold keeps going.
  maxScroll: () => scroll_margin.value + virtualizer.value.getTotalSize() - window.innerHeight,
  onReorder: reorderCard
})

const virtualizer = useWindowVirtualizer(
  computed(() => ({
    count: all_cards.value.length,
    estimateSize: () => CARD_LIST_ROW_PITCH,
    overscan: OVERSCAN,
    scrollMargin: scroll_margin.value,
    getItemKey: (i: number) => all_cards.value[i].client_id,
    // Keeps the dragged row rendered past the overscan window so it doesn't unmount mid-drag.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      const dragging = reorder.dragging_index.value
      if (dragging === null || indexes.includes(dragging)) return indexes
      return [...indexes, dragging].sort((a, b) => a - b)
    }
  }))
)

function onReorderStart(index: number, event: PointerEvent) {
  reorder.start(index, event)
  if (reorder.dragging_index.value === null) return

  lifted_row = (event.target as HTMLElement).closest<HTMLElement>('[data-testid="card-list-item"]')
  if (lifted_row) liftListItem(lifted_row)
}

/** Map a card's client_id to its row index and scroll it into view, even outside the current virtual window. */
function scrollToCard(client_id: string) {
  const index = all_cards.value.findIndex((c) => c.client_id === client_id)
  if (index === -1) return

  virtualizer.value.scrollToIndex(index, { align: 'center' })
}

// Viewport-space bottom of the sticky toolbar (md+) — the inset drag auto-scroll-up starts from.
let sticky_toolbar: HTMLElement | null = null
// Held so the matching drop, which fires from a window pointerup, can settle it back.
let lifted_row: HTMLElement | null = null

onMounted(() => {
  sticky_toolbar = document.querySelector('[data-testid="deck-view__toolbar"]')
  registerScroller({ scrollToCard })
})

onBeforeUnmount(() => registerScroller(null))

watchEffect(() => {
  const items = virtualizer.value.getVirtualItems()
  const last_index = items.at(-1)?.index ?? -1

  if (
    last_index >= all_cards.value.length - LOAD_MORE_THRESHOLD &&
    hasNextPage.value &&
    !isLoading.value
  ) {
    loadNextPage()
  }
})

// Settle the lifted row back to rest the moment the drag ends (engine clears
// dragging_index on the window pointerup).
watch(
  () => reorder.dragging_index.value,
  (current, previous) => {
    if (current !== null || previous === null || !lifted_row) return
    dropListItem(lifted_row)
    lifted_row = null
  }
)

defineExpose({ scrollToCard })
</script>

<template>
  <div ref="list_el" data-testid="card-list" class="w-full pb-24 pt-5 bg-surface">
    <div
      data-testid="card-list__viewport"
      class="relative w-full mx-auto"
      :style="{ height: `${virtualizer.getTotalSize()}px` }"
    >
      <div
        v-for="vrow in virtualizer.getVirtualItems()"
        :key="vrow.key as number"
        data-testid="card-list__row"
        class="absolute top-0 left-0 w-full"
        :class="
          vrow.index === reorder.dragging_index.value ? 'z-20' : 'hover:z-10 focus-within:z-10'
        "
        :style="{
          height: `${vrow.size}px`,
          transform: `translateY(${vrow.start - scroll_margin}px)`
        }"
      >
        <div
          data-testid="card-list__row-inner"
          class="flex justify-center will-change-transform"
          :class="{
            'transition-transform duration-150 ease-out': reorder.shouldTransition(vrow.index),
            'cursor-grabbing': vrow.index === reorder.dragging_index.value
          }"
          :style="{
            transform: `translate(${reorder.dragOffset(vrow.index).x}px, ${reorder.dragOffset(vrow.index).y}px)`
          }"
        >
          <list-item
            :index="vrow.index"
            :card="all_cards[vrow.index]"
            :dragging="vrow.index === reorder.dragging_index.value"
            @reorder-pointerdown="onReorderStart(vrow.index, $event)"
          />
        </div>
      </div>
    </div>

    <div
      v-if="isLoading"
      data-testid="card-list__loading"
      class="w-full py-6 flex items-center justify-center text-ink-muted"
    >
      <span>{{ t('deck-view.card-editor.list.loading') }}</span>
    </div>
  </div>
</template>
