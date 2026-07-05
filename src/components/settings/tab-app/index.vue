<script setup lang="ts">
import { inject } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import AudioSection from './audio-section.vue'
import AccessibilitySection from './accessibility-section.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { settingsLayoutKey } from '../layout'

const layout_mode = inject(settingsLayoutKey)!
</script>

<template>
  <section-list data-testid="tab-app" class="px-(--settings-padding) pb-(--settings-padding)">
    <audio-section />
    <accessibility-section />

    <settings-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
