<script setup lang="ts">
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import { useI18n } from 'vue-i18n'
import type { SkippedImportLine } from '@/utils/card/csv'

defineProps<{
  lines: SkippedImportLine[]
  close: () => void
}>()

const { t } = useI18n()
</script>

<template>
  <dialog-card
    data-testid="skipped-lines-dialog"
    size="sm"
    :title="t('deck-view.card-import.skipped-dialog.title')"
    @close="close"
  >
    <div
      data-testid="skipped-lines-dialog__list"
      class="scroll-hidden flex h-full flex-col gap-2 overflow-y-auto"
    >
      <div
        v-for="line in lines"
        :key="line.line"
        data-testid="skipped-lines-dialog__line"
        class="flex items-start gap-3 rounded-4 bg-below px-3 py-2"
      >
        <span
          data-testid="skipped-lines-dialog__line-number"
          class="shrink-0 rounded-2 bg-element px-1.5 py-0.5 text-xs text-on-element"
        >
          {{ line.line }}
        </span>

        <p data-testid="skipped-lines-dialog__line-text" class="skipped-line-text text-base">
          {{ line.text }}
        </p>
      </div>
    </div>
  </dialog-card>
</template>

<style scoped>
/* A long line wraps once, then trails off — the point is recognising which line
   it was, not reading all of it. */
.skipped-line-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;

  color: var(--color-ink);
  overflow-wrap: anywhere;
}
</style>
