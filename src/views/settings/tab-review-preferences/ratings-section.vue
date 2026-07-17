<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import ReviewRatingsToggle from './review-ratings-toggle.vue'
import { memberEditorKey } from '@/composables/member/editor'

const { t } = useI18n()
const editor = inject(memberEditorKey)!
</script>

<template>
  <labeled-section
    :label="t('settings.review-preferences.ratings.label')"
    :description="t('settings.review-preferences.ratings.description')"
  >
    <div data-testid="tab-review-preferences__ratings">
      <review-ratings-toggle v-model:value="editor.draft.preferences.study.show_all_ratings" />
    </div>
  </labeled-section>
</template>
