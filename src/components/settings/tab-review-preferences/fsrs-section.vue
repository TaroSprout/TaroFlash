<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { memberEditorKey } from '@/composables/member/editor'

const { t } = useI18n()
const editor = inject(memberEditorKey)!
</script>

<template>
  <labeled-section
    :label="t('settings.review-preferences.fsrs.section-heading')"
    :description="t('settings.review-preferences.fsrs.section-description')"
  >
    <div data-testid="tab-review-preferences__fsrs" class="flex items-center justify-between gap-4">
      <span
        data-testid="tab-review-preferences__fsrs-label"
        class="text-brown-700 dark:text-brown-100"
      >
        {{ t('settings.review-preferences.fsrs.desired-retention-label') }}
      </span>

      <ui-spinbox v-model:value="editor.preferences.study.desired_retention" :min="70" :max="97" />
    </div>
  </labeled-section>
</template>
