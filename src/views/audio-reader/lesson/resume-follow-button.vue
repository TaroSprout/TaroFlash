<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'

const { direction } = defineProps<{ direction: 'up' | 'down' }>()

const emit = defineEmits<{ resume: [] }>()

const { t } = useI18n()

// Point the arrow the way back to the playing word — up when it's scrolled above
// the member, down when it's below.
const icon = computed(() => (direction === 'up' ? 'arcade-stick-up' : 'arcade-stick-down'))
</script>

<template>
  <ui-button
    data-theme="brown-300"
    :icon-left="icon"
    icon-only
    rounded-full
    size="lg"
    class="shadow-sm"
    @click="emit('resume')"
  >
    {{ t('lesson-view.resume-follow-button') }}
  </ui-button>
</template>
