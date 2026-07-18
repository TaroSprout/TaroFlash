<script setup lang="ts">
import { computed, onMounted, provide, ref, useTemplateRef, watch } from 'vue'
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
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import TabSheet from '@/components/layout-kit/sheet/tab-sheet.vue'
import TabDetails from './tab-details/index.vue'
import TabDesign from './tab-design/index.vue'
import TabReviewPacing from './tab-review-pacing/index.vue'
import TabDangerZone from './tab-danger-zone/index.vue'
import TabIndex from './tab-index/index.vue'
import { TAB_META, type TabValue } from './tabs'

export type DeckSettingsResponse = boolean
export type ActiveTab = TabValue

const { deck, close, initial_tab, initial_side } = defineProps<{
  deck: Deck
  close: (response?: DeckSettingsResponse) => void
  initial_tab?: ActiveTab
  initial_side?: CardSide
}>()

const TAB_COMPONENTS = {
  index: TabIndex,
  details: TabDetails,
  design: TabDesign,
  'review-pacing': TabReviewPacing,
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

const active_tab_ref = useTemplateRef<{ onChromeBack?: () => boolean }>('active_tab_ref')

if (initial_tab) active_tab.value = initial_tab

const DESKTOP_TABS: TabValue[] = ['design', 'review-pacing', 'danger-zone']

const tabs = computed(() =>
  DESKTOP_TABS.map((value) => ({
    value,
    icon: TAB_META[value].icon,
    label: t(TAB_META[value].labelKey)
  }))
)

const displayed_tab = computed(
  () => active_tab.value ?? (layout_mode.value === 'desktop' ? 'design' : 'index')
)

const sidebar_active = computed({
  get: () => active_tab.value ?? 'design',
  set: (v) => (active_tab.value = v as ActiveTab)
})

const header_title = computed(() => deck.title || t('deck.settings-modal.title'))

const visible_side = computed(() =>
  displayed_tab.value === 'design' ? editor.active_side.value : 'cover'
)

const tab_component = computed(() => TAB_COMPONENTS[displayed_tab.value])

// The content row is always full-bleed: `__main` (the scroll container) owns its
// own padding and the aside owns its own inset, so floating elements/outlines
// aren't clipped by the overflow and the sheet-mode tab animation stays clean.
const tab_content_class = 'flex h-full items-start'

onMounted(async () => {
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

function onChromeBack() {
  if (active_tab_ref.value?.onChromeBack?.()) return
  onBack()
}

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
    :class="[
      layout_mode === 'desktop' ? 'w-236!' : 'w-full! max-w-205.5',
      layout_mode !== 'sheet' && 'h-181.5',
      layout_mode === 'sheet'
        ? '[--deck-settings-padding:var(--sheet-px)]'
        : '[--deck-settings-padding:0px]'
    ]"
    :sheet_px="sheet_px"
    :tabs="tabs"
    :pattern_config="{ pattern: 'endless-clouds' }"
    :parts="{ content: tab_content_class }"
    :show_back="active_tab !== null"
    v-model:active="sidebar_active"
    @close="onClose"
    @back="onChromeBack"
  >
    <template #header-content>
      <div
        data-testid="deck-settings__header"
        class="w-full flex flex-col max-md:items-center max-md:text-center"
        :class="layout_mode === 'tablet' && 'pt-4'"
      >
        <h1
          data-testid="deck-settings__header-title"
          class="flex items-center gap-3 text-5xl text-white"
        >
          {{ header_title }}
        </h1>
      </div>
    </template>

    <div
      class="relative flex flex-1 flex-col min-w-0"
      :class="layout_mode !== 'sheet' && 'max-h-full'"
    >
      <div
        ref="tab_outlet"
        data-testid="deck-settings__main"
        :class="[
          'flex flex-col gap-4 w-full',
          layout_mode === 'sheet'
            ? 'max-w-111 mx-auto overflow-hidden pt-0.5'
            : 'min-h-0 flex-1 overflow-y-auto scroll-hidden px-(--sheet-px) pb-8'
        ]"
      >
        <transition :css="false" mode="out-in" @leave="onTabLeave" @enter="onTabEnter">
          <component
            ref="active_tab_ref"
            :is="tab_component"
            :key="displayed_tab"
            @navigate="onNavigate"
          />
        </transition>
      </div>

      <scroll-bar
        v-if="layout_mode !== 'sheet'"
        data-theme="brown-200"
        target="[data-testid='deck-settings__main']"
        class="absolute top-2 bottom-4 right-0"
      />
    </div>

    <!-- Aside has a bespoke layout so it matches visually with the pinned preview -->
    <deck-aside
      v-if="layout_mode !== 'sheet'"
      data-testid="deck-settings__aside"
      class="w-92 shrink-0 self-end pb-8"
      :class="layout_mode === 'tablet' ? 'pt-66 pr-22' : 'pt-70 px-8'"
    />

    <template #overlay>
      <div
        v-if="layout_mode !== 'sheet'"
        data-testid="deck-settings__pinned-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <deck-pinned-preview
          :cover="editor.draft.cover_config"
          :card_attributes="editor.draft.card_attributes"
          :side="visible_side"
          :front_text="editor.preview_front_text.value"
          :back_text="editor.preview_back_text.value"
          @update:side="onPreviewSide"
        />
      </div>
    </template>
  </tab-sheet>
</template>
