<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import SettingsSaveButton from './settings-save-button.vue'
import { memberEditorKey } from '@/composables/member/editor'

const { t } = useI18n()
const editor = inject(memberEditorKey)!
</script>

<template>
  <aside
    data-testid="settings-aside"
    class="h-full flex flex-col justify-between gap-5 text-brown-700 dark:text-brown-100"
  >
    <div data-testid="settings-aside__inputs" class="flex flex-col gap-2">
      <ui-input
        :placeholder="t('settings.aside.name-placeholder')"
        text-align="center"
        size="lg"
        v-model:value="editor.settings.display_name"
      />
      <ui-textarea
        :placeholder="t('settings.aside.bio-placeholder')"
        :max_chars="100"
        rows="3"
        v-model:value="editor.settings.description"
      />
    </div>

    <settings-save-button />
  </aside>
</template>
