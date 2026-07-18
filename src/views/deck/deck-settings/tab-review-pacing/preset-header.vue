<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import PresetChip from './preset-chip.vue'
import { pacingFieldsKey } from './pacing-fields'

const { t } = useI18n()
const { has_overrides, override_count, resetAllOverrides } = inject(pacingFieldsKey)!

const divergence_label = computed(() =>
  t('deck.settings-modal.review-pacing.preset-diverged', override_count.value)
)
</script>

<template>
  <crossfade-resize data-testid="preset-header">
    <div
      v-if="has_overrides"
      data-testid="preset-header__band"
      class="flex flex-wrap items-center justify-between gap-3 rounded-4 bg-brown-100 dark:bg-stone-700 px-4 py-3"
    >
      <div data-testid="preset-header__status" class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <preset-chip />
        <span class="text-base text-brown-500">{{ divergence_label }}</span>
      </div>

      <ui-button
        data-testid="preset-header__reset-all"
        data-theme="brown-500"
        variant="ghost"
        size="sm"
        icon-left="refresh"
        :sfx="{ press: 'snappy_button_5' }"
        @press="resetAllOverrides"
      >
        {{ t('deck.settings-modal.review-pacing.reset-all') }}
      </ui-button>
    </div>

    <div v-else data-testid="preset-header__rule" class="flex flex-col gap-1">
      <div class="flex justify-end">
        <preset-chip />
      </div>
      <ui-divider />
    </div>
  </crossfade-resize>
</template>
