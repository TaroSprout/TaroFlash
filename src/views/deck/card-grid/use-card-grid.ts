import { type CardGridSize } from '@/composables/deck/view-shell'
import { computed, toValue, type CSSProperties, type MaybeRefOrGetter } from 'vue'

const XL_CARD_WIDTH = 314
const XL_GAP = 16
const CARD_SCALE: Record<CardGridSize, number> = {
  base: 0.56,
  md: 0.75,
  xl: 1
}

export function useCardGrid(grid_size: MaybeRefOrGetter<CardGridSize>) {
  const card_scale = computed(() => CARD_SCALE[toValue(grid_size)])

  const grid_classes = computed(() => ['grid', 'justify-center'])

  const grid_style = computed<CSSProperties>(() => ({
    gap: `${XL_GAP * card_scale.value}px`,
    gridTemplateColumns: `repeat(auto-fill, ${XL_CARD_WIDTH * card_scale.value}px)`
  }))

  return { card_scale, grid_style, grid_classes }
}
