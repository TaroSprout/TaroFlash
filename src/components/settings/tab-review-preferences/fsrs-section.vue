<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { memberEditorKey } from '@/composables/member/editor'

type LearningStepsKey = 'none' | '10m' | '1m-10m' | '1m-10m-1d'
type RelearningStepsKey = 'none' | '10m' | '1m-10m'

const LEARNING_STEP_PRESETS: Record<LearningStepsKey, string[]> = {
  none: [],
  '10m': ['10m'],
  '1m-10m': ['1m', '10m'],
  '1m-10m-1d': ['1m', '10m', '1d']
}

const RELEARNING_STEP_PRESETS: Record<RelearningStepsKey, string[]> = {
  none: [],
  '10m': ['10m'],
  '1m-10m': ['1m', '10m']
}

function keyForSteps<K extends string>(presets: Record<K, string[]>, steps: string[]): K {
  const match = (Object.keys(presets) as K[]).find(
    (key) => presets[key].length === steps.length && presets[key].every((s, i) => s === steps[i])
  )
  return match ?? ('none' as K)
}

const { t } = useI18n()
const editor = inject(memberEditorKey)!

const learning_steps_options = computed(() => [
  {
    value: 'none' as LearningStepsKey,
    label: t('settings.review-preferences.fsrs.step-preset-none')
  },
  {
    value: '10m' as LearningStepsKey,
    label: t('settings.review-preferences.fsrs.step-preset-10m')
  },
  {
    value: '1m-10m' as LearningStepsKey,
    label: t('settings.review-preferences.fsrs.step-preset-1m-10m')
  },
  {
    value: '1m-10m-1d' as LearningStepsKey,
    label: t('settings.review-preferences.fsrs.step-preset-1m-10m-1d')
  }
])

const relearning_steps_options = computed(() => [
  {
    value: 'none' as RelearningStepsKey,
    label: t('settings.review-preferences.fsrs.step-preset-none')
  },
  {
    value: '10m' as RelearningStepsKey,
    label: t('settings.review-preferences.fsrs.step-preset-10m')
  },
  {
    value: '1m-10m' as RelearningStepsKey,
    label: t('settings.review-preferences.fsrs.step-preset-1m-10m')
  }
])

const learning_steps_key = computed<LearningStepsKey>({
  get: () => keyForSteps(LEARNING_STEP_PRESETS, editor.preferences.study.learning_steps),
  set: (key) => (editor.preferences.study.learning_steps = LEARNING_STEP_PRESETS[key])
})

const relearning_steps_key = computed<RelearningStepsKey>({
  get: () => keyForSteps(RELEARNING_STEP_PRESETS, editor.preferences.study.relearning_steps),
  set: (key) => (editor.preferences.study.relearning_steps = RELEARNING_STEP_PRESETS[key])
})
</script>

<template>
  <labeled-section
    :label="t('settings.review-preferences.fsrs.section-heading')"
    :description="t('settings.review-preferences.fsrs.section-description')"
  >
    <div data-testid="tab-review-preferences__fsrs" class="flex flex-col gap-4">
      <div
        data-testid="tab-review-preferences__fsrs-retention"
        class="flex items-center justify-between gap-4"
      >
        <span
          data-testid="tab-review-preferences__fsrs-retention-label"
          class="text-brown-700 dark:text-brown-100"
        >
          {{ t('settings.review-preferences.fsrs.desired-retention-label') }}
        </span>

        <ui-spinbox
          v-model:value="editor.preferences.study.desired_retention"
          :min="70"
          :max="97"
        />
      </div>

      <div
        data-testid="tab-review-preferences__fsrs-learning-steps"
        class="flex items-center justify-between gap-4"
      >
        <span
          data-testid="tab-review-preferences__fsrs-learning-steps-label"
          class="text-brown-700 dark:text-brown-100"
        >
          {{ t('settings.review-preferences.fsrs.learning-steps-label') }}
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
        data-testid="tab-review-preferences__fsrs-relearning-steps"
        class="flex items-center justify-between gap-4"
      >
        <span
          data-testid="tab-review-preferences__fsrs-relearning-steps-label"
          class="text-brown-700 dark:text-brown-100"
        >
          {{ t('settings.review-preferences.fsrs.relearning-steps-label') }}
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
