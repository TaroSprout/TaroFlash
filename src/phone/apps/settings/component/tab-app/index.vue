<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import UiToggle from '@/components/ui-kit/toggle.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import SettingsBackButton from '../settings-back-button.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsLayoutKey } from '../../layout'

const { t } = useI18n()
const editor = inject(memberEditorKey)!
const layout_mode = inject(settingsLayoutKey)!

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <section-list data-testid="tab-app">
    <settings-back-button @back="emit('back')" />

    <labeled-section :label="t('settings.app.section.audio')">
      <div
        data-testid="tab-app__audio"
        class="grid grid-cols-[auto_1fr] items-center gap-y-6 gap-x-8 text-brown-700 dark:text-brown-300 select-none"
      >
        <span>{{ t('settings.app.audio.study-sounds') }}</span>
        <ui-spinbox v-model:value="editor.preferences.audio.study_sounds" :min="1" :max="10" />
        <span>{{ t('settings.app.audio.interface-sounds') }}</span>
        <ui-spinbox v-model:value="editor.preferences.audio.interface_sounds" :min="1" :max="10" />
        <span>{{ t('settings.app.audio.hover-sounds') }}</span>
        <ui-spinbox v-model:value="editor.preferences.audio.hover_sounds" :min="1" :max="10" />
      </div>
    </labeled-section>

    <labeled-section :label="t('settings.app.section.accessibility')">
      <div data-testid="tab-app__accessibility" class="flex flex-col gap-4">
        <ui-toggle v-model:checked="editor.preferences.accessibility!.left_hand">
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

    <settings-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
