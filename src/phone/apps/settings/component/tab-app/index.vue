<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSlider from '@/components/ui-kit/slider.vue'
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

const interface_volume = ref(50)
const alerts_volume = ref(50)
const rewards_volume = ref(50)

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <section-list data-testid="tab-app">
    <settings-back-button @back="emit('back')" />

    <labeled-section :label="t('settings.app.section.audio')">
      <div
        data-testid="tab-app__sliders"
        class="grid grid-cols-[auto_1fr] gap-y-8 gap-x-20 text-brown-700 dark:text-brown-300 select-none"
      >
        <h3>{{ t('settings.app.audio.interface') }}</h3>
        <ui-slider :label="t('settings.app.audio.interface')" v-model="interface_volume" />
        <h3>{{ t('settings.app.audio.alerts') }}</h3>
        <ui-slider :label="t('settings.app.audio.alerts')" v-model="alerts_volume" />
        <h3>{{ t('settings.app.audio.rewards') }}</h3>
        <ui-slider :label="t('settings.app.audio.rewards')" v-model="rewards_volume" />
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
