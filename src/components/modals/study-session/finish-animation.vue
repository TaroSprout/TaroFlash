<script setup lang="ts">
import Burst from '@/components/ui-kit/burst.vue'
import { emitStudySfx } from '@/sfx/bus'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()

onMounted(() => {
  emitStudySfx('music_pizz_prompt')
})
</script>

<template>
  <div class="absolute inset-0 z-10 flex items-center justify-center">
    <p
      class="text-purple-500 text-2xl relative z-10 pointer-events-none select-none session-finish__text"
    >
      {{ t('study-session.finish.text') }}
    </p>
    <burst
      size="lg"
      :duration="700"
      color="var(--color-purple-500)"
      class="top-1/2 left-1/2"
      style="translate: -50% -50%"
      @done="emit('done')"
    />
  </div>
</template>

<style>
.session-finish__text {
  animation: session-finish-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes session-finish-pop {
  from {
    opacity: 0;
    scale: 0.6;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
</style>
