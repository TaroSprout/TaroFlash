<script setup lang="ts">
import ListItem from './list-item.vue'
import { inject, useTemplateRef, computed, ref, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWindowVirtualizer, defaultRangeExtractor } from '@tanstack/vue-virtual'
import { cardEditorKey } from '@/views/deck/composables'
import { usePinScrollWhileTyping } from '@/composables/ui/pin-scroll-while-typing'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useReorderDrag } from './use-reorder-drag'

const { t } = useI18n()

const ROW_PITCH = 407
const LOAD_MORE_THRESHOLD = 5
const OVERSCAN = 3

const { list, selection, reorderCard, hasNextPage, isLoading, loadNextPage } =
  inject(cardEditorKey)!
const { all_cards } = list

const list_el = useTemplateRef<HTMLElement>('list_el')
const scroll_margin = ref(0)
const is_above_md = useMatchMedia('w>=md')

usePinScrollWhileTyping(() => list_el.value)

const reorder = useReorderDrag({
  pitch: ROW_PITCH,
  count: () => all_cards.value.length,
  enabled: () => is_above_md.value && !selection.is_selecting.value,
  onReorder: reorderCard
})

const virtualizer = useWindowVirtualizer(
  computed(() => ({
    count: all_cards.value.length,
    estimateSize: () => ROW_PITCH,
    overscan: OVERSCAN,
    scrollMargin: scroll_margin.value,
    getItemKey: (i: number) => all_cards.value[i].client_id,
    // Keep the dragged row in the rendered range even after auto-scroll carries
    // its slot out of the overscan window — otherwise it unmounts mid-drag.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      const dragging = reorder.dragging_index.value
      if (dragging === null || indexes.includes(dragging)) return indexes
      return [...indexes, dragging].sort((a, b) => a - b)
    }
  }))
)

// The list flows in the page below the sticky toolbar (and, below xl, the
// hero), so the window virtualizer needs the list's document offset to map
// page scroll onto row positions. Measure the container, not the list itself:
// during a mode-swap the list is briefly transformed (it slides into place),
// which would corrupt its own rect — the container stays in flow.
function measureScrollMargin() {
  const container = list_el.value?.parentElement
  if (!container) return
  scroll_margin.value = container.getBoundingClientRect().top + window.scrollY
}

let resize_observer: ResizeObserver | undefined

onMounted(() => {
  measureScrollMargin()
  resize_observer = new ResizeObserver(measureScrollMargin)
  resize_observer.observe(document.body)
})

onBeforeUnmount(() => resize_observer?.disconnect())

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
</script>

<template>
  <div
    ref="list_el"
    data-testid="card-list"
    class="w-full pb-24 pt-5 bg-brown-100 dark:bg-grey-900"
  >
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
          :style="{ transform: `translateY(${reorder.dragOffset(vrow.index)}px)` }"
        >
          <list-item
            :index="vrow.index"
            :card="all_cards[vrow.index]"
            @reorder-pointerdown="reorder.start(vrow.index, $event)"
          />
        </div>
      </div>
    </div>

    <div
      v-if="isLoading"
      data-testid="card-list__loading"
      class="w-full py-6 flex items-center justify-center text-brown-500"
    >
      <span>{{ t('deck-view.card-editor.list.loading') }}</span>
    </div>
  </div>
</template>
