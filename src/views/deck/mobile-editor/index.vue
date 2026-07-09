<script setup lang="ts">
import { computed, inject, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import EditorHeader from './editor-header.vue'
import EditorStage from './editor-stage.vue'
import EditorControls from './editor-controls.vue'
import { mobileCardEditorKey } from './mobile-card-editor-key'

type MobileEditorProps = {
  close: () => void
}

const { close } = defineProps<MobileEditorProps>()

const { t } = useI18n()
const { index, cards, onClosed } = inject(mobileCardEditorKey)!

const position = computed(() => ({ index: index.value + 1, total: cards.value.length }))
const title = computed(() => t('deck-view.mobile-editor.position', position.value))

onUnmounted(() => onClosed())
</script>

<template>
  <dialog-card
    data-testid="mobile-card-editor"
    :title="title"
    :close_label="t('deck-view.mobile-editor.done-button')"
    size="lg"
    @close="close"
  >
    <template #header-end>
      <editor-header />
    </template>

    <div class="flex w-full h-full flex-col justify-between gap-4 pt-4 pb-6">
      <editor-stage />
      <editor-controls />
    </div>
  </dialog-card>
</template>
