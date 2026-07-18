<script setup lang="ts">
import { inject } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import AudioSection from './audio-section.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { sheetLayoutKey } from '@/components/layout-kit/sheet/sheet-layout'

const layout_mode = inject(sheetLayoutKey)!
</script>

<template>
  <section-list data-testid="tab-app" class="px-(--settings-padding) pb-(--settings-padding)">
    <audio-section />

    <settings-save-button v-if="layout_mode === 'phone'" />
  </section-list>
</template>
