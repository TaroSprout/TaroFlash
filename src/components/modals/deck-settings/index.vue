<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DeckAside from './deck-aside.vue'
import { deckSettingsLayoutKey, deckSettingsCloseKey } from './layout'
import { emitSfx } from '@/sfx/bus'
import { useDeckEditor, deckEditorKey } from '@/composables/deck/editor'
import { useDeckDangerActions, deckDangerActionsKey } from '@/composables/deck/danger-actions'
import { useTabModalLayout } from '@/composables/ui/tab-modal-layout'
import { useTabTransition } from '@/composables/ui/tab-transition'
import { useAlert } from '@/composables/alert'
import { useModalAfterEnter, useModalRequestClose } from '@/composables/modal'
import DeckPinnedPreview from '@/components/deck/pinned-preview.vue'
import TabSheet from '@/components/layout-kit/modal/tab-sheet.vue'

export type DeckSettingsResponse = boolean
export type ActiveTab = 'design' | 'study' | 'danger-zone'

const { deck, close, initial_tab, initial_side } = defineProps<{
  deck: Deck
  close: (response?: DeckSettingsResponse) => void
  initial_tab?: ActiveTab
  initial_side?: CardSide
}>()

const TabDesign = defineAsyncComponent(() => import('./tab-design/index.vue'))
const TabStudy = defineAsyncComponent(() => import('./tab-study/index.vue'))
const TabDangerZone = defineAsyncComponent(() => import('./tab-danger-zone/index.vue'))
const TabIndex = defineAsyncComponent(() => import('./tab-index/index.vue'))

const TAB_COMPONENTS = {
  index: TabIndex,
  design: TabDesign,
  study: TabStudy,
  'danger-zone': TabDangerZone
}

const { t } = useI18n()

const editor = useDeckEditor(deck)
provide(deckEditorKey, editor)

const danger = useDeckDangerActions(editor, deck, close)
provide(deckDangerActionsKey, danger)

const alert = useAlert()
useModalRequestClose(() => onClose())
const after_enter = useModalAfterEnter()

const { layout_mode, sheet_px } = useTabModalLayout({ desktop_query: 'w>=lg & fine' })
provide(deckSettingsLayoutKey, layout_mode)
provide(deckSettingsCloseKey, close)

const active_tab = ref<ActiveTab | null>(null)
const tab_outlet = ref<HTMLElement>()

const { nav_direction, onTabEnter, onTabLeave } = useTabTransition(layout_mode, tab_outlet)

if (initial_tab) active_tab.value = initial_tab

const tabs = computed(() => [
  { value: 'design', icon: 'paint-brush', label: t('deck.settings-modal.tab.design') },
  { value: 'study', icon: 'school-cap', label: t('deck.settings-modal.tab.study') },
  { value: 'danger-zone', icon: 'delete', label: t('deck.settings-modal.tab.danger-zone') }
])

const displayed_tab = computed(
  () => active_tab.value ?? (layout_mode.value === 'desktop' ? 'design' : 'index')
)

const sidebar_active = computed({
  get: () => active_tab.value ?? 'design',
  set: (v) => (active_tab.value = v as ActiveTab)
})

const header_title = computed(() => t(`deck.settings-modal.header.${displayed_tab.value}.title`))

const visible_side = computed(() =>
  displayed_tab.value === 'design' ? editor.active_side.value : 'cover'
)

const tab_component = computed(() => TAB_COMPONENTS[displayed_tab.value])

onMounted(async () => {
  const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 200))
  idle(() => {
    import('./tab-design/index.vue')
    import('./tab-study/index.vue')
    import('./tab-danger-zone/index.vue')
    import('./tab-index/index.vue')
  })

  if (initial_side) {
    await after_enter
    editor.setActiveSide(initial_side)
  }
})

function onPreviewSide(side: CardSide) {
  if (displayed_tab.value !== 'design') return
  editor.setActiveSide(side)
}

async function onClose() {
  if (!editor.is_dirty.value) return close(false)
  const { response } = alert.warn({
    title: t('deck.settings-modal.unsaved-alert.title'),
    message: t('deck.settings-modal.unsaved-alert.message'),
    confirmLabel: t('deck.settings-modal.unsaved-alert.confirm'),
    cancelLabel: t('deck.settings-modal.unsaved-alert.cancel')
  })
  if (await response) close(false)
}

function onNavigate(tab: ActiveTab) {
  nav_direction.value = 'forward'
  active_tab.value = tab
}

function onBack() {
  emitSfx('snappy_button_5')
  nav_direction.value = 'back'
  active_tab.value = null
}

watch(layout_mode, (mode) => {
  if (mode !== 'desktop' && active_tab.value === 'danger-zone') active_tab.value = null
})

// Leaving a tab (back to the index) resets the designer side to cover — assign
// directly rather than via setActiveSide so it doesn't fire the slide sfx.
watch(active_tab, (tab) => {
  if (tab === null) editor.active_side.value = 'cover'
})
</script>

<template>
  <tab-sheet
    data-testid="deck-settings-container"
    data-theme="green-500"
    data-theme-dark="green-800"
    :data-layout="layout_mode"
    :class="layout_mode === 'desktop' ? 'w-248!' : 'w-full! max-w-205.5'"
    :sheet_px="sheet_px"
    :tabs="tabs"
    :pattern_config="{ pattern: 'endless-clouds' }"
    :parts="{ content: 'flex gap-14 h-full items-start' }"
    v-model:active="sidebar_active"
    @close="onClose"
  >
    <template #header-content>
      <div
        data-testid="deck-settings__header"
        class="w-full flex flex-col max-md:items-center max-md:text-center"
        :class="layout_mode === 'tablet' && 'pt-4'"
      >
        <h1 data-testid="deck-settings__header-title" class="text-5xl text-white">
          {{ header_title }}
        </h1>
      </div>
    </template>

    <div
      ref="tab_outlet"
      data-testid="deck-settings__main"
      :class="[
        'relative flex flex-1 flex-col gap-4 w-full min-w-0',
        layout_mode === 'sheet' && 'max-w-111 mx-auto overflow-hidden pt-0.5 pl-0.5'
      ]"
    >
      <transition :css="false" mode="out-in" @leave="onTabLeave" @enter="onTabEnter">
        <component :is="tab_component" :key="displayed_tab" @navigate="onNavigate" @back="onBack" />
      </transition>
    </div>

    <deck-aside
      v-if="layout_mode !== 'sheet'"
      data-testid="deck-settings__aside"
      class="w-78.5 shrink-0 self-end pt-70"
    />

    <template #overlay>
      <div
        v-if="layout_mode !== 'sheet'"
        data-testid="deck-settings__pinned-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <deck-pinned-preview
          :cover="editor.cover"
          :card_attributes="editor.card_attributes"
          :side="visible_side"
          :front_text="editor.preview_front_text.value"
          :back_text="editor.preview_back_text.value"
          @update:side="onPreviewSide"
        />
      </div>
    </template>

    <template #footer />
  </tab-sheet>
</template>
