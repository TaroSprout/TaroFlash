<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildExportText } from './export-text'
import { injectColorTuner } from './use-color-tuner'
import UiButton from '@/components/ui-kit/button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'

const { t } = useI18n()
const tuner = injectColorTuner()

const export_open = ref(false)
const copied = ref(false)

const export_text = computed(() => (export_open.value ? buildExportText(tuner) : ''))

const undo_title = computed(() =>
  tuner.undo_label.value
    ? t(tuner.undo_label.value.key, tuner.undo_label.value.params ?? {})
    : t('admin.color-tuner.undo-empty-label')
)

const redo_title = computed(() =>
  tuner.redo_label.value
    ? t(tuner.redo_label.value.key, tuner.redo_label.value.params ?? {})
    : t('admin.color-tuner.redo-empty-label')
)

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// A text field keeps its own undo stack; taking the shortcut here would strand a half-typed name.
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable]')) return
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return

  event.preventDefault()
  if (event.shiftKey) tuner.redo()
  else tuner.undo()
}

function onCopy() {
  void navigator.clipboard?.writeText(export_text.value)
  copied.value = true
}

function onToggleExport() {
  export_open.value = !export_open.value
  copied.value = false
}
</script>

<template>
  <div data-testid="tuner-toolbar" class="flex flex-wrap items-center gap-2 pb-3">
    <ui-button
      data-testid="tuner-toolbar__undo"
      size="sm"
      neutral
      icon-left="arrow-back"
      :disabled="!tuner.undo_label.value"
      :title="undo_title"
      @press="tuner.undo()"
    >
      {{ t('admin.color-tuner.undo-button') }}
    </ui-button>

    <ui-button
      data-testid="tuner-toolbar__redo"
      size="sm"
      neutral
      icon-left="arrow-right"
      :disabled="!tuner.redo_label.value"
      :title="redo_title"
      @press="tuner.redo()"
    >
      {{ t('admin.color-tuner.redo-button') }}
    </ui-button>

    <span data-testid="tuner-toolbar__pending" class="text-base text-ink-muted truncate">
      {{ tuner.undo_label.value ? undo_title : '' }}
    </span>

    <div data-testid="tuner-toolbar__actions" class="ml-auto flex items-center gap-2">
      <ui-button
        data-testid="tuner-toolbar__reset-all"
        size="sm"
        neutral
        icon-left="refresh"
        @press="tuner.resetAll()"
      >
        {{ t('admin.color-tuner.reset-all-button') }}
      </ui-button>

      <ui-popover
        :open="export_open"
        position="bottom-end"
        :use_arrow="false"
        shadow
        teleport
        @close="export_open = false"
      >
        <template #trigger>
          <ui-button
            data-testid="tuner-toolbar__export"
            size="sm"
            neutral
            :active="export_open"
            @press="onToggleExport"
          >
            {{ t('admin.color-tuner.export-button') }}
          </ui-button>
        </template>

        <div
          data-testid="tuner-toolbar__export-panel"
          data-station="float"
          class="flex w-160 max-w-[80vw] flex-col gap-3 rounded-4 bg-surface p-4"
        >
          <pre
            data-testid="tuner-toolbar__export-text"
            class="max-h-100 overflow-auto rounded-3 bg-well p-3 text-base text-ink whitespace-pre"
            >{{ export_text }}</pre
          >

          <ui-button
            data-testid="tuner-toolbar__copy"
            size="sm"
            neutral
            :icon-left="copied ? 'check' : 'paperclip'"
            @press="onCopy"
          >
            {{ copied ? t('admin.color-tuner.copied-label') : t('admin.color-tuner.copy-button') }}
          </ui-button>
        </div>
      </ui-popover>
    </div>
  </div>
</template>
