<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import { CARD_IMPORT_ACCEPT } from '@/utils/card/csv'

type DropZoneProps = {
  /** Shown in place of the prompt when the last file couldn't be read. */
  error?: string | null
}

const { error } = defineProps<DropZoneProps>()

const emit = defineEmits<{
  (e: 'file', file: File): void
  (e: 'dismiss-error'): void
}>()

const { t } = useI18n()

const file_input = useTemplateRef<HTMLInputElement>('file_input')
// Counted rather than flagged, so crossing a child element doesn't read as leaving.
const drag_depth = ref(0)

function browse() {
  emitSfx('select')
  file_input.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('file', file)

  // Reset so re-picking the same file fires `change` again.
  input.value = ''
}

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  emit('dismiss-error')
  drag_depth.value++
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  drag_depth.value--
}

/** Allow dropping by preventing the browser's default navigate-to-file. */
function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  drag_depth.value = 0

  const file = e.dataTransfer?.files[0]
  if (file) emit('file', file)
}

// Chimes once as the file arrives over the zone, not on every child dragenter.
watch(drag_depth, (now, was) => {
  if (now > 0 && was === 0) emitSfx('music_plink_mid')
})
</script>

<template>
  <div
    data-testid="card-import-drop-zone"
    :data-active="drag_depth > 0 || undefined"
    :data-error="error ? '' : undefined"
    :data-palette="error ? 'danger' : undefined"
    class="card-import-drop-zone"
    v-sfx="{ hover: 'ui.hover' }"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <input
      ref="file_input"
      data-testid="card-import-drop-zone__input"
      type="file"
      class="hidden"
      :accept="CARD_IMPORT_ACCEPT"
      @change="onFileChange"
    />

    <template v-if="error">
      <ui-icon src="close" class="size-8" />

      <p data-testid="card-import-drop-zone__error" class="text-base">{{ error }}</p>

      <ui-button
        data-testid="card-import-drop-zone__dismiss-error"
        size="sm"
        data-palette="error"
        @press="emit('dismiss-error')"
      >
        {{ t('deck-view.card-import.dismiss-error') }}
      </ui-button>
    </template>

    <button
      v-else
      type="button"
      data-testid="card-import-drop-zone__browse"
      class="flex flex-col items-center gap-2"
      @click="browse"
    >
      <ui-icon src="file-add" class="size-8" />
      <span class="text-base">{{ t('deck-view.card-import.drop-zone.prompt') }}</span>
    </button>
  </div>
</template>

<style scoped>
.card-import-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;

  width: 100%;
  padding: 24px 16px;

  border: 3px dashed var(--color-raised-shade);
  border-radius: var(--radius-4);
  background-color: var(--color-well);
  color: var(--color-ink-muted);

  text-align: center;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

/* The whole zone is one drop target, so nothing inside it may reset the cursor
   the way a bare <button> does. */
.card-import-drop-zone * {
  cursor: inherit;
}

/* The zone only colours up once it's the pointer's target — and a held file
   never produces a hover, so the drag state has to claim the same treatment. */
.card-import-drop-zone:hover,
.card-import-drop-zone[data-active] {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Below the dock's own breakpoint the zone lives in the bottom bar, where there
   is no pointer to hover it — resting neutral would leave it neutral forever. */
@media (width < 52rem) {
  .card-import-drop-zone {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}

/* A file held over the zone fills it in, so the drop target reads as live
   without the prompt changing under the pointer. */
.card-import-drop-zone[data-active] {
  background-color: color-mix(in srgb, var(--color-accent) 15%, var(--color-well));
}

.card-import-drop-zone[data-error] {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
