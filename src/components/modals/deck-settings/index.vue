<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DeckAside from './deck-aside.vue'
import { deckSettingsLayoutKey, deckSettingsCloseKey, type DeckSettingsLayout } from './layout'
import { emitSfx } from '@/sfx/bus'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { tabSlideEnter, tabSlideLeave } from '@/utils/animations/tab-slide'
import { useDeckEditor, deckEditorKey } from '@/composables/deck/editor'
import {
  useDeckDangerActions,
  deckDangerActionsKey
} from '@/composables/deck/danger-actions'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useAlert } from '@/composables/alert'
import { useModalAfterEnter, useModalRequestClose } from '@/composables/modal'
import UiIcon from '@/components/ui-kit/icon.vue'
import Card from '@/components/card/index.vue'
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
const DeckDesignPreview = defineAsyncComponent(
  () => import('@/components/deck/deck-design-preview.vue')
)

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

// sheet:   w < md          — no aside, no floating preview, slide tab transitions
// tablet:  md ≤ w < lg     — aside visible, no floating preview
// desktop: w ≥ lg & fine   — sidebar + floating preview, wider modal
const _is_sheet = useMatchMedia('w<md')
const _is_desktop = useMatchMedia('w>=lg & fine')
const layout_mode = computed<DeckSettingsLayout>(() => {
  if (_is_sheet.value) return 'sheet'
  if (_is_desktop.value) return 'desktop'
  return 'tablet'
})
provide(deckSettingsLayoutKey, layout_mode)
provide(deckSettingsCloseKey, close)

const active_tab = ref<ActiveTab | null>(null)
const nav_direction = ref<'forward' | 'back'>('forward')
const tab_outlet = ref<HTMLElement>()
const tab_initial_render = ref(true)

const sheet_px = computed(() => {
  if (layout_mode.value !== 'tablet') return '2rem'
  return '4.5rem'
})

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
  emitSfx('ui.snappy_button_5')
  nav_direction.value = 'back'
  active_tab.value = null
}

function onTabLeave(el: Element, done: () => void) {
  if (layout_mode.value === 'sheet') {
    tabSlideLeave(nav_direction, tab_outlet.value)(el, done)
    return
  }
  fadeLeave(el, done)
}

function onTabEnter(el: Element, done: () => void) {
  if (tab_initial_render.value) {
    tab_initial_render.value = false
    done()
    return
  }
  if (layout_mode.value === 'sheet') {
    tabSlideEnter(nav_direction, tab_outlet.value)(el, done)
    return
  }
  fadeEnter(el, done)
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
    hover_sfx="ui.click_07"
    v-model:active="sidebar_active"
    @close="onClose"
  >
    <template #header-content>
      <div
        data-testid="deck-settings__header"
        class="w-full flex flex-col max-md:items-center max-md:text-center"
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
        data-testid="deck-settings__floating-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <div class="relative">
          <card
            size="xl"
            class="absolute! -top-2 right-1"
            face_classes="bg-white! dark:bg-stone-700!"
          />

          <div
            data-testid="deck-settings__preview-paperclip"
            class="absolute -top-8 right-15 -translate-x-1/2 z-10 drop-shadow-2xs"
          >
            <ui-icon src="paperclip" class="w-16 h-16 -rotate-186 text-grey-300" />
          </div>

          <deck-design-preview
            :deck_id="deck.id"
            :cover="editor.cover"
            :card_attributes="editor.card_attributes"
            :side="visible_side"
            class="rotate-4 drop-shadow-sm"
            @update:side="onPreviewSide"
          />
        </div>
      </div>
    </template>

    <template #footer />
  </tab-sheet>
</template>
