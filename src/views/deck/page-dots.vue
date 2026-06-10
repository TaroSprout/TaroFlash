<script setup lang="ts">
import { inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { emitSfx } from '@/sfx/bus'
import { useModeConfig } from './modes'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'

const editor = inject(cardEditorKey)!
const mode_config = useModeConfig()
const { t } = useI18n()

const { total_pages, page, can_paginate, goToPage } = editor.carousel

const row_ref = useTemplateRef<HTMLElement>('row')
const hovered_index = ref<number | null>(null)

function onPointerMove(e: PointerEvent) {
  const row = row_ref.value
  if (!row) return

  const rect = row.getBoundingClientRect()
  const t = (e.clientX - rect.left) / rect.width
  const i = Math.floor(t * total_pages.value)

  const next = Math.max(0, Math.min(total_pages.value - 1, i))

  if (next !== hovered_index.value) {
    hovered_index.value = next
    emitSfx('ui.click_07', { debounce: 10 })
  }
}

function onPointerLeave() {
  hovered_index.value = null
}

function onClick() {
  if (hovered_index.value !== null) goToPage(hovered_index.value)
}
</script>

<template>
  <div
    v-if="can_paginate"
    data-testid="deck-view__page-dots"
    data-theme="brown-700"
    data-theme-dark="brown-100"
    :data-engaged="hovered_index !== null || undefined"
    class="hidden md:block sm:row-start-3 sm:col-start-2 justify-self-center relative cursor-pointer transition-opacity duration-300 before:content-[''] before:absolute before:-inset-x-10 before:-inset-y-3"
    :class="{ 'opacity-0 pointer-events-none overflow-hidden': !mode_config.pagination }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @click="onClick"
  >
    <div ref="row" data-testid="deck-view__page-dots__row" class="flex items-center gap-2">
      <ui-tooltip
        v-for="n in total_pages"
        :key="n"
        element="span"
        :text="t('deck-view.page-dots.tooltip', { page: n })"
        :visible="hovered_index === n - 1"
        position="top"
        :gap="6"
        :data-testid="`deck-view__page-dots__dot-${n}`"
        :data-active="hovered_index === n - 1 || page === n - 1 || undefined"
        class="size-2 rounded-full bg-(--theme-primary) opacity-50 scale-75 data-active:opacity-100 data-active:scale-125 transition-[opacity,scale] duration-200 ease-out pointer-events-none"
      />
    </div>
  </div>
</template>
