<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import TooltipRow from '../tooltip-row.vue'
import DailyLimits from './daily-limits.vue'
import { usePacingFields } from '../use-pacing-fields'
import { emitSfx } from '@/sfx/bus'
import type { DeckPacingEditorState } from '@/utils/deck/payload'

const { deck, pacing, close } = defineProps<{
  deck: Deck
  pacing: DeckPacingEditorState
  close: () => void
}>()

const { t } = useI18n()

const {
  preset_options,
  selected_preset_value,
  max_reviews_per_day,
  max_new_per_day,
  desired_retention,
  learning_steps_key,
  learning_steps_options,
  relearning_steps_key,
  relearning_steps_options
} = usePacingFields(deck, pacing)

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))
</script>

<template>
  <dialog-card
    data-testid="advanced-pacing-modal"
    size="md"
    :title="t('deck.settings-modal.review-pacing.advanced-modal.title')"
    class="grid-rows-[auto_1fr_auto]! pb-(--dialog-px)"
    @close="close()"
  >
    <template #header-end>
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

    <div data-testid="advanced-pacing-modal__content" class="flex flex-col gap-4">
      <daily-limits
        :deck="deck"
        v-model:max_reviews="max_reviews_per_day"
        v-model:max_new="max_new_per_day"
      />

      <tooltip-row
        data-testid="tab-review-pacing__retention"
        :label="t('deck.settings-modal.review-pacing.desired-retention-label')"
        :tooltip="t('deck.settings-modal.review-pacing.desired-retention-tooltip')"
      >
        <ui-spinbox v-model:value="desired_retention" :min="70" :max="97" />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__learning-steps"
        :label="t('deck.settings-modal.review-pacing.learning-steps-label')"
        :tooltip="t('deck.settings-modal.review-pacing.learning-steps-tooltip')"
      >
        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          v-model="learning_steps_key"
          :options="learning_steps_options"
          class="w-32"
        />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__relearning-steps"
        :label="t('deck.settings-modal.review-pacing.relearning-steps-label')"
        :tooltip="t('deck.settings-modal.review-pacing.relearning-steps-tooltip')"
      >
        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          v-model="relearning_steps_key"
          :options="relearning_steps_options"
          class="w-32"
        />
      </tooltip-row>
    </div>

    <ui-button
      data-testid="advanced-pacing-modal__done"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="lg"
      full-width
      @press="close()"
    >
      {{ t('deck.settings-modal.review-pacing.advanced-modal.done') }}
    </ui-button>
  </dialog-card>
</template>
