<script setup lang="ts">
import ListItem from './list-item.vue'
import { inject, useTemplateRef, computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { t } = useI18n()

const ROW_PITCH = 407
const LOAD_MORE_THRESHOLD = 5
const OVERSCAN = 3

const { list, hasNextPage, isLoading, loadNextPage } = inject<CardListController>('card-editor')!
const { all_cards } = list

const scroll_el = useTemplateRef<HTMLElement>('scroll_el')

const virtualizer = useVirtualizer(
  computed(() => ({
    count: all_cards.value.length,
    getScrollElement: () => scroll_el.value,
    estimateSize: () => ROW_PITCH,
    overscan: OVERSCAN,
    getItemKey: (i: number) => all_cards.value[i].client_id
  }))
)

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
    ref="scroll_el"
    data-testid="card-list"
    class="w-full h-full overflow-y-auto pb-24 pt-5 bg-brown-100 dark:bg-grey-900 scroll-hidden"
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
        class="absolute top-0 left-0 w-full flex justify-center hover:z-10 focus-within:z-10"
        :style="{
          height: `${vrow.size}px`,
          transform: `translateY(${vrow.start}px)`
        }"
      >
        <list-item
          :index="vrow.index"
          :card="all_cards[vrow.index]"
          :duplicate="all_cards[vrow.index].is_duplicate ?? false"
        />
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
