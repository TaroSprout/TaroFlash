<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiToggle from '@/components/ui-kit/toggle.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { memberEditorKey } from '@/composables/member/editor'

const { t } = useI18n()
const editor = inject(memberEditorKey)!
</script>

<template>
  <labeled-section :label="t('settings.app.section.accessibility')">
    <div data-testid="tab-app__accessibility" class="flex flex-col gap-4">
      <ui-toggle v-model:checked="editor.draft.preferences.accessibility.left_hand">
        <span class="flex flex-col">
          <span data-testid="tab-app__left-hand-label">{{
            t('settings.app.accessibility.left-hand-label')
          }}</span>
          <span class="text-sm text-brown-500 dark:text-brown-300">{{
            t('settings.app.accessibility.left-hand-description')
          }}</span>
        </span>
      </ui-toggle>
    </div>
  </labeled-section>
</template>
