<script setup lang="ts">
import { inject, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSlider from '@/components/ui-kit/slider.vue'
import UiToggle from '@/components/ui-kit/toggle.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import SettingsBackButton from '../settings-back-button.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsLayoutKey } from '../../layout'
import { toBusVolumes } from '@/utils/member/preferences'
import audio_player from '@/sfx/player'

const emit = defineEmits<{ back: [] }>()

const { t } = useI18n()
const editor = inject(memberEditorKey)!
const layout_mode = inject(settingsLayoutKey)!

onBeforeUnmount(() => audio_player.resetSettings())

watch(
  () => editor.preferences.audio,
  (audio) => audio_player.previewVolumeConfig(toBusVolumes(audio)),
  { deep: true }
)
</script>

<template>
  <section-list data-testid="tab-app">
    <settings-back-button @back="emit('back')" />

    <labeled-section :label="t('settings.app.section.audio')">
      <div data-testid="tab-app__audio" class="flex flex-col gap-3">
        <ui-slider
          v-model="editor.preferences.audio.study_sounds"
          :min="0"
          :max="10"
          :label="t('settings.app.audio.study-sounds')"
          :sfx="{ bus: 'study' }"
        />
        <ui-slider
          v-model="editor.preferences.audio.interface_sounds"
          :min="0"
          :max="10"
          :label="t('settings.app.audio.interface-sounds')"
          :sfx="{ bus: 'interface' }"
        />
        <ui-slider
          v-model="editor.preferences.audio.hover_sounds"
          :min="0"
          :max="10"
          :label="t('settings.app.audio.hover-sounds')"
          :sfx="{ bus: 'hover' }"
        />
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
