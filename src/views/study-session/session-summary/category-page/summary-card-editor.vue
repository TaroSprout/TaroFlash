<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StudyCardEdit from '@/views/study-session/session-studying/card/study-card-edit.vue'
import { emitSfx } from '@/sfx/bus'
import type { StudyCard } from '@/views/study-session/composables/session-engine'

type SummaryCardEditorProps = { card: StudyCard }

const { card } = defineProps<SummaryCardEditorProps>()

const emit = defineEmits<{
  (e: 'update', side: 'front' | 'back', text: string): void
  (e: 'done'): void
}>()

const { t } = useI18n()
const side = ref<'front' | 'back'>('front')

function onFlip() {
  emitSfx(side.value === 'front' ? 'transition_up' : 'transition_down')
  side.value = side.value === 'front' ? 'back' : 'front'
}

function onDone() {
  emitSfx('music_plink_ok')
  emit('done')
}
</script>

<template>
  <div data-testid="session-summary__card-editor" class="flex flex-col items-center gap-4">
    <study-card-edit :card="card" :side="side" @update="(s, text) => emit('update', s, text)" />

    <div
      data-testid="session-summary__card-editor-actions"
      class="z-10 flex justify-center gap-2 text-2xl"
    >
      <button
        type="button"
        data-testid="session-summary__card-editor-flip"
        class="text-ink cursor-pointer rounded-full bg-raised px-13 py-4 hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
        @click="onFlip"
      >
        {{ t('study.flashcard.edit-footer.flip-button') }}
      </button>
      <button
        type="button"
        data-testid="session-summary__card-editor-done"
        class="cursor-pointer rounded-full bg-(--color-accent) px-13 py-4 text-(--color-on-accent) hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
        @click="onDone"
      >
        {{ t('study-session.edit.done') }}
      </button>
    </div>
  </div>
</template>
