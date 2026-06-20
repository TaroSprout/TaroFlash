<script setup lang="ts">
import { inject } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import AudioSection from '../app-settings/audio-section.vue'
import AccessibilitySection from '../app-settings/accessibility-section.vue'
import SettingsBackButton from '../settings-back-button.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { settingsLayoutKey } from '../../layout'

const emit = defineEmits<{ back: [] }>()

const layout_mode = inject(settingsLayoutKey)!
</script>

<template>
  <section-list data-testid="tab-app">
    <settings-back-button @back="emit('back')" />

    <audio-section />
    <accessibility-section />

    <settings-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
