<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiButton from '@/components/ui-kit/button.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { usePacingFields } from './use-pacing-fields'

const { t } = useI18n()
const { deck, pacing } = inject(deckEditorKey)!

const {
  preset_options,
  selected_preset_value,
  is_overridden,
  resetOverrides,
  desired_retention,
  learning_steps_key,
  learning_steps_options,
  relearning_steps_key,
  relearning_steps_options
} = usePacingFields(deck!, pacing)
</script>

<template>
  <labeled-section
    :label="t('deck.settings-modal.review-pacing.section-heading')"
    :description="t('deck.settings-modal.review-pacing.section-description')"
  >
    <template v-if="is_overridden" #actions>
      <ui-button
        data-testid="tab-review-pacing__reset-overrides"
        size="sm"
        variant="ghost"
        @press="resetOverrides"
      >
        {{ t('deck.settings-modal.review-pacing.reset-to-preset') }}
      </ui-button>
    </template>

    <div data-testid="tab-review-pacing__pacing" class="flex flex-col gap-4">
      <div data-testid="tab-review-pacing__preset" class="flex items-center justify-between gap-4">
        <span class="text-brown-700 dark:text-brown-100">
          {{ t('deck.settings-modal.review-pacing.preset-label') }}
        </span>

        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          v-model="selected_preset_value"
          :options="preset_options"
          class="w-40"
        />
      </div>

      <div
        data-testid="tab-review-pacing__retention"
        class="flex items-center justify-between gap-4"
      >
        <span class="text-brown-700 dark:text-brown-100">
          {{ t('deck.settings-modal.review-pacing.desired-retention-label') }}
        </span>

        <ui-spinbox v-model:value="desired_retention" :min="70" :max="97" />
      </div>

      <div
        data-testid="tab-review-pacing__learning-steps"
        class="flex items-center justify-between gap-4"
      >
        <span class="text-brown-700 dark:text-brown-100">
          {{ t('deck.settings-modal.review-pacing.learning-steps-label') }}
        </span>

        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          v-model="learning_steps_key"
          :options="learning_steps_options"
          class="w-32"
        />
      </div>

      <div
        data-testid="tab-review-pacing__relearning-steps"
        class="flex items-center justify-between gap-4"
      >
        <span class="text-brown-700 dark:text-brown-100">
          {{ t('deck.settings-modal.review-pacing.relearning-steps-label') }}
        </span>

        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          v-model="relearning_steps_key"
          :options="relearning_steps_options"
          class="w-32"
        />
      </div>
    </div>
  </labeled-section>
</template>
