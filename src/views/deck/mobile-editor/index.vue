<script setup lang="ts">
import { computed, onUnmounted, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import EditorHeader from './editor-header.vue'
import EditorStage from './editor-stage.vue'
import EditorControls from './editor-controls.vue'
import { mobileCardEditorKey } from './mobile-card-editor-key'
import type { MobileCardEditor } from './use-mobile-card-editor'

type MobileEditorProps = {
  api: MobileCardEditor
}

const { api } = defineProps<MobileEditorProps>()

const { t } = useI18n()
provide(mobileCardEditorKey, api)

const { index, cards, onClosed } = api

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
    class="grid-rows-[auto_1fr_auto]! pb-(--dialog-px) bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-(--color-element-pattern)"
    bg_class="bg-brown-300 dark:bg-grey-900"
  >
    <template #header-end>
      <editor-header />
    </template>

    <editor-stage class="self-center" />
    <editor-controls />
  </dialog-card>
</template>
