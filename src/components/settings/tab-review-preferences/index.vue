<script setup lang="ts">
import { inject } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import RatingsSection from './ratings-section.vue'
import FsrsSection from './fsrs-section.vue'
import SettingsBackButton from '../settings-back-button.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { settingsLayoutKey } from '../layout'

const emit = defineEmits<{ back: [] }>()

const layout_mode = inject(settingsLayoutKey)!
</script>

<template>
  <section-list
    data-testid="tab-review-preferences"
    class="px-(--settings-padding) pb-(--settings-padding)"
  >
    <settings-back-button @back="emit('back')" />

    <ratings-section />
    <fsrs-section />

    <settings-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
