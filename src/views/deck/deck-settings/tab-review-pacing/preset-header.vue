<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import PresetChip from './preset-chip.vue'
import { pacingFieldsKey } from './use-pacing-fields'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'

const { t } = useI18n()
const { override_count, resetAllOverrides } = inject(pacingFieldsKey)!

const has_overrides = computed(() => override_count.value > 0)

const divergence_label = computed(() =>
  t('deck.settings-modal.review-pacing.preset-diverged', override_count.value)
)
</script>

<template>
  <div data-testid="preset-header" class="flex flex-col gap-1">
    <div
      data-testid="preset-header__row"
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <h2 data-testid="preset-header__title" class="text-2xl text-ink">
        {{ t('deck.settings-modal.review-pacing.heading') }}
      </h2>

      <div data-testid="preset-header__controls" class="flex shrink-0 items-center gap-2">
        <transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
          <div
            v-if="has_overrides"
            data-testid="preset-header__divergence"
            class="flex items-center gap-1"
          >
            <span data-testid="preset-header__count" class="text-base text-ink-muted">
              {{ divergence_label }}
            </span>

            <ui-button
              neutral
              data-testid="preset-header__reset-all"
              variant="ghost"
              size="sm"
              icon-only
              icon-left="refresh"
              :sfx="{ press: 'snappy_button_5' }"
              @press="resetAllOverrides"
            >
              {{ t('deck.settings-modal.review-pacing.reset-all') }}
            </ui-button>
          </div>
        </transition>

        <preset-chip />
      </div>
    </div>

    <p data-testid="preset-header__subheading" class="text-base text-ink-muted">
      {{ t('deck.settings-modal.review-pacing.subheading') }}
    </p>

    <ui-divider class="mt-2 max-md:hidden" />
  </div>
</template>
