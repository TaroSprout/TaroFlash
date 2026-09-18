<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { usePageStrip } from './composables/page-strip'
import { SPREAD_GAP, pageWidth, slotsForSpread, spreadCount } from '@/utils/reader/spread'

type PageStripProps = {
  pageCount: number
  twoPage: boolean
  viewportWidth: number
  spread: number
}

type PageStripEmits = {
  turn: [spread: number]
}

const { pageCount, twoPage, viewportWidth, spread } = defineProps<PageStripProps>()

const emit = defineEmits<PageStripEmits>()

defineSlots<{
  default: (props: { pageIndex: number; primary: boolean }) => unknown
}>()

const scroller = useTemplateRef<HTMLElement>('scroller')

const spread_count = computed(() => spreadCount(pageCount, twoPage))
const slot_width = computed(() => pageWidth(viewportWidth, twoPage))

const { virtualizer, at_rest } = usePageStrip({
  scroller,
  spread_count: () => spread_count.value,
  item_size: () => viewportWidth,
  desired_spread: () => spread,
  onTurn: (target) => emit('turn', target)
})

defineExpose({ at_rest })

function slotsAt(spread_index: number) {
  return slotsForSpread(spread_index, pageCount, twoPage)
}
</script>

<template>
  <div
    ref="scroller"
    data-testid="page-strip"
    class="page-strip relative h-full w-full snap-x snap-mandatory touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain"
  >
    <div
      data-testid="page-strip__track"
      class="relative h-full"
      :style="{ width: `${virtualizer.getTotalSize()}px` }"
    >
      <div
        v-for="item in virtualizer.getVirtualItems()"
        :key="item.index"
        data-testid="page-strip__spread"
        class="absolute top-0 flex h-full snap-start"
        :style="{
          left: `${item.start}px`,
          width: `${item.size}px`,
          gap: `${SPREAD_GAP}px`
        }"
      >
        <div
          v-for="unit in slotsAt(item.index)"
          :key="unit.page_index"
          data-testid="page-strip__slot"
          class="h-full shrink-0"
          :style="{ width: `${slot_width}px` }"
        >
          <slot :page-index="unit.page_index" :primary="unit.primary" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-strip {
  scrollbar-width: none;
}
.page-strip::-webkit-scrollbar {
  display: none;
}
</style>
