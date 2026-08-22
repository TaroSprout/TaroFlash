<script setup lang="ts">
import { ref } from 'vue'
import StudyCardEdit from '@/views/study-session/session-studying/card/study-card-edit.vue'
import { emitSfx } from '@/sfx/bus'
import type { StudyCard } from '@/views/study-session/composables/session-engine'

type SummaryCardEditorProps = { card: StudyCard }

const { card } = defineProps<SummaryCardEditorProps>()

const emit = defineEmits<{
  (e: 'update', side: 'front' | 'back', text: string): void
}>()

defineExpose({ flip })

const side = ref<'front' | 'back'>('front')

/** Flip/Done render in the session footer; the footer's Flip button calls this. */
function flip() {
  emitSfx(side.value === 'front' ? 'card.flip-away' : 'card.flip-back')
  side.value = side.value === 'front' ? 'back' : 'front'
}
</script>

<template>
  <div data-testid="session-summary__card-editor" class="flex flex-col items-center">
    <study-card-edit :card="card" :side="side" @update="(s, text) => emit('update', s, text)" />
  </div>
</template>
