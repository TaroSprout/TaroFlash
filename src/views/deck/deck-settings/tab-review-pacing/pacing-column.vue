<script setup lang="ts">
import { ref } from 'vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import LimitsSection from './limits-section.vue'
import SchedulingSection from './scheduling-section.vue'

const is_advanced_open = ref(false)

function toggleAdvanced() {
  is_advanced_open.value = !is_advanced_open.value
}
</script>

<template>
  <crossfade-resize data-testid="pacing-column">
    <scheduling-section
      v-if="is_advanced_open"
      data-testid="tab-review-pacing__advanced-panel"
      @back="toggleAdvanced"
    />
    <limits-section v-else @advance="toggleAdvanced" />
  </crossfade-resize>
</template>
