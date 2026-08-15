<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModeColumn from './mode-column.vue'
import RolePanel from './role-panel.vue'
import ShadeList from './shade-list.vue'
import { MODES, type Mode, type StationName } from './catalog'
import { buildExportText } from './export-text'
import { colorTunerKey, useColorTuner, type ChangeLabel } from './use-color-tuner'

type OpenPanel = { mode: Mode; station: StationName; anchor: HTMLElement }

const PANEL_WIDTH = 352
const PANEL_GAP = 12

const { t } = useI18n()
const tuner = useColorTuner()
provide(colorTunerKey, tuner)

const open_panel = ref<OpenPanel | null>(null)
const panel_style = ref<Record<string, string>>({})
const copied = ref(false)

const export_text = computed(() => buildExportText(tuner))

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
})

function labelText(label: ChangeLabel | null): string {
  return label ? t(label.key, label.params ?? {}) : t('admin.color-page.toolbar.nothing-to-undo')
}

function onOpenRoles(mode: Mode, station: StationName, anchor: HTMLElement) {
  const same = open_panel.value?.mode === mode && open_panel.value?.station === station
  if (same) return closePanel()

  open_panel.value = { mode, station, anchor }
  placePanel()
}

function closePanel() {
  open_panel.value = null
}

/**
 * Puts the panel beside the preview it edits, measured against the viewport so the placement holds
 * however many columns the width happens to give the previews.
 */
function placePanel() {
  const preview = open_panel.value?.anchor.closest('section')
  if (!preview) return

  const rect = preview.getBoundingClientRect()
  const fits_right = rect.right + PANEL_GAP + PANEL_WIDTH <= window.innerWidth
  const left = fits_right ? rect.right + PANEL_GAP : rect.left - PANEL_GAP - PANEL_WIDTH

  panel_style.value = {
    top: `${Math.max(PANEL_GAP, Math.min(rect.top, window.innerHeight - 420))}px`,
    left: `${Math.max(PANEL_GAP, left)}px`
  }
}

function onResize() {
  if (open_panel.value) placePanel()
}

// A text field owns its own undo stack, so the page only claims the shortcut outside one.
function onKeydown(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
  if (isTextEntry(event.target)) return

  event.preventDefault()
  if (event.shiftKey) tuner.redo()
  else tuner.undo()
}

function isTextEntry(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false

  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable === true
  )
}

async function onCopy() {
  await navigator.clipboard.writeText(export_text.value)
  copied.value = true
}

watch(export_text, () => (copied.value = false))
</script>

<template>
  <div data-testid="admin-color-page" class="flex flex-col gap-6 pb-8">
    <header
      data-testid="admin-color-page__toolbar"
      class="flex flex-wrap items-center gap-2 text-base text-ink"
    >
      <button
        type="button"
        data-testid="admin-color-page__undo"
        :disabled="!tuner.undo_label.value"
        class="rounded-2 bg-raised px-2.5 py-1 disabled:opacity-40"
        :class="tuner.undo_label.value && 'cursor-pointer'"
        @click="tuner.undo()"
      >
        {{ t('admin.color-page.toolbar.undo', { change: labelText(tuner.undo_label.value) }) }}
      </button>

      <button
        type="button"
        data-testid="admin-color-page__redo"
        :disabled="!tuner.redo_label.value"
        class="rounded-2 bg-raised px-2.5 py-1 disabled:opacity-40"
        :class="tuner.redo_label.value && 'cursor-pointer'"
        @click="tuner.redo()"
      >
        {{ t('admin.color-page.toolbar.redo', { change: labelText(tuner.redo_label.value) }) }}
      </button>

      <button
        type="button"
        data-testid="admin-color-page__reset"
        class="cursor-pointer rounded-2 bg-raised px-2.5 py-1"
        @click="tuner.resetAll()"
      >
        {{ t('admin.color-page.toolbar.reset-button') }}
      </button>

      <button
        type="button"
        data-testid="admin-color-page__copy"
        class="ml-auto cursor-pointer rounded-2 bg-(--color-accent) px-2.5 py-1 text-(--color-on-accent)"
        @click="onCopy"
      >
        {{ t(copied ? 'admin.color-page.toolbar.copied' : 'admin.color-page.toolbar.copy-button') }}
      </button>
    </header>

    <div data-testid="admin-color-page__modes" class="grid gap-6 lg:grid-cols-2">
      <mode-column
        v-for="mode in MODES"
        :key="mode"
        :mode="mode"
        :open_station="open_panel?.mode === mode ? open_panel.station : null"
        @open-roles="
          (station: StationName, anchor: HTMLElement) => onOpenRoles(mode, station, anchor)
        "
      />
    </div>

    <shade-list />

    <details data-testid="admin-color-page__export" class="rounded-4 bg-well p-3 text-ink">
      <summary class="cursor-pointer text-base font-semibold">
        {{ t('admin.color-page.export.title') }}
      </summary>

      <textarea
        data-testid="admin-color-page__export-text"
        readonly
        class="mt-2 h-96 w-full rounded-2 bg-surface p-2 font-mono text-base text-ink"
        :value="export_text"
      />
    </details>

    <div
      v-if="open_panel"
      data-testid="admin-color-page__role-panel"
      class="fixed z-50"
      :style="panel_style"
    >
      <role-panel
        :key="`${open_panel.mode}-${open_panel.station}`"
        :mode="open_panel.mode"
        :station="open_panel.station"
        @close="closePanel"
      />
    </div>
  </div>
</template>
