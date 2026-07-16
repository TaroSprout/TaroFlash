<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { usePacingFields } from './use-pacing-fields'
import type { DeckPacingEditorState } from '@/utils/deck/payload'

const { deck, pacing, close } = defineProps<{
  deck: Deck
  pacing: DeckPacingEditorState
  close: () => void
}>()

const { t } = useI18n()

const {
  desired_retention,
  learning_steps_key,
  learning_steps_options,
  relearning_steps_key,
  relearning_steps_options
} = usePacingFields(deck, pacing)
</script>

<template>
  <dialog-card
    data-testid="advanced-pacing-modal"
    size="sm"
    :title="t('deck.settings-modal.review-pacing.advanced-modal.title')"
    @close="close()"
  >
    <div data-testid="advanced-pacing-modal__content" class="flex flex-col gap-4">
      <div
        data-testid="tab-review-pacing__retention"
        class="flex items-center justify-between gap-4"
      >
        <span
          data-testid="tab-review-pacing__retention-label"
          class="flex items-center gap-2 text-brown-700 dark:text-brown-100"
        >
          {{ t('deck.settings-modal.review-pacing.desired-retention-label') }}
          <ui-tooltip
            element="span"
            :text="t('deck.settings-modal.review-pacing.desired-retention-tooltip')"
            class="flex cursor-pointer items-center"
          >
            <ui-icon src="info-circle" class="size-4 shrink-0" />
          </ui-tooltip>
        </span>

        <ui-spinbox v-model:value="desired_retention" :min="70" :max="97" />
      </div>

      <div
        data-testid="tab-review-pacing__learning-steps"
        class="flex items-center justify-between gap-4"
      >
        <span
          data-testid="tab-review-pacing__learning-steps-label"
          class="flex items-center gap-2 text-brown-700 dark:text-brown-100"
        >
          {{ t('deck.settings-modal.review-pacing.learning-steps-label') }}
          <ui-tooltip
            element="span"
            :text="t('deck.settings-modal.review-pacing.learning-steps-tooltip')"
            class="flex cursor-pointer items-center"
          >
            <ui-icon src="info-circle" class="size-4 shrink-0" />
          </ui-tooltip>
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
        <span
          data-testid="tab-review-pacing__relearning-steps-label"
          class="flex items-center gap-2 text-brown-700 dark:text-brown-100"
        >
          {{ t('deck.settings-modal.review-pacing.relearning-steps-label') }}
          <ui-tooltip
            element="span"
            :text="t('deck.settings-modal.review-pacing.relearning-steps-tooltip')"
            class="flex cursor-pointer items-center"
          >
            <ui-icon src="info-circle" class="size-4 shrink-0" />
          </ui-tooltip>
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
  </dialog-card>
</template>
