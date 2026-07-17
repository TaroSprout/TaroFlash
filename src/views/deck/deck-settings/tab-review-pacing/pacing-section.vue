<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import TooltipRow from './tooltip-row.vue'
import SchedulingSection from './scheduling-section.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { DAILY_LIMIT_BOUNDS } from '@/utils/deck/defaults'
import { usePacingFields } from './use-pacing-fields'
import { accordionEnter, accordionLeave } from '@/utils/animations/accordion'
import { emitSfx } from '@/sfx/bus'

const { t } = useI18n()
const { deck, pacing } = inject(deckEditorKey)!

const {
  preset_options,
  selected_preset_value,
  max_reviews_per_day,
  max_new_per_day,
  has_max_reviews_override,
  has_max_new_override,
  has_advanced_override,
  resetMaxReviewsPerDay,
  resetMaxNewPerDay
} = usePacingFields(deck!, pacing)

const is_advanced_open = ref(false)

function toggleAdvanced() {
  is_advanced_open.value = !is_advanced_open.value
  emitSfx(is_advanced_open.value ? 'wooden_chime_ring' : 'pop_up_close')
}
</script>

<template>
  <labeled-section
    :label="t('deck.settings-modal.review-pacing.section-heading')"
    :description="t('deck.settings-modal.review-pacing.section-description')"
  >
    <template #actions>
      <ui-select-menu
        data-testid="tab-review-pacing__preset"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        menu-theme="brown-100"
        menu-theme-dark="stone-700"
        size="sm"
        v-model="selected_preset_value"
        :options="preset_options"
      />
    </template>

    <div data-testid="tab-review-pacing__pacing" class="flex flex-col gap-4 items-end">
      <tooltip-row
        data-testid="tab-review-pacing__max-reviews"
        :label="t('deck.settings-modal.review-pacing.max-reviews-per-day')"
        :tooltip="t('deck.settings-modal.review-pacing.max-reviews-tooltip')"
        :overridden="has_max_reviews_override"
        class="w-full"
        @reset="resetMaxReviewsPerDay"
      >
        <ui-spinbox
          data-testid="tab-review-pacing__max-reviews-spinbox"
          v-model:value="max_reviews_per_day"
          :min="DAILY_LIMIT_BOUNDS.min"
          :max="deck?.card_count"
          :step="DAILY_LIMIT_BOUNDS.step"
          wrap
        />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__max-new"
        :label="t('deck.settings-modal.review-pacing.max-new-per-day')"
        :tooltip="t('deck.settings-modal.review-pacing.max-new-tooltip')"
        :overridden="has_max_new_override"
        class="w-full"
        @reset="resetMaxNewPerDay"
      >
        <ui-spinbox
          data-testid="tab-review-pacing__max-new-spinbox"
          v-model:value="max_new_per_day"
          :min="DAILY_LIMIT_BOUNDS.min"
          :max="deck?.card_count"
          :step="DAILY_LIMIT_BOUNDS.step"
          wrap
        />
      </tooltip-row>

      <div class="relative">
        <ui-button
          data-testid="tab-review-pacing__advanced"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          size="sm"
          @press="toggleAdvanced"
        >
          <span class="flex items-center gap-2">
            {{ t('deck.settings-modal.review-pacing.advanced-toggle') }}
            <ui-icon
              src="line-arrow-right"
              class="size-4 transition-transform duration-200"
              :class="{ 'rotate-90': is_advanced_open }"
            />
          </span>
        </ui-button>

        <span
          v-if="has_advanced_override"
          data-testid="tab-review-pacing__advanced-badge"
          class="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-red-400 dark:bg-red-500"
        ></span>
      </div>
    </div>

    <transition :css="false" @enter="accordionEnter" @leave="accordionLeave">
      <scheduling-section v-if="is_advanced_open" data-testid="tab-review-pacing__advanced-panel" />
    </transition>
  </labeled-section>
</template>
