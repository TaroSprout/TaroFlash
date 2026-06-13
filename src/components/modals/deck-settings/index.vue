<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, provide, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DeckAside from './deck-aside.vue'
import { emitSfx } from '@/sfx/bus'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { slideFadeRightEnter, slideFadeRightLeave } from '@/utils/animations/slide-fade-right'
import { tabHeightEnter, tabHeightLeave } from '@/utils/animations/tab-height'
import { useDeckEditor, deckEditorKey } from '@/composables/deck-editor'
import {
  useDeckDangerActions,
  deckDangerActionsKey
} from '@/composables/deck/use-deck-danger-actions'
import { useMatchMedia } from '@/composables/use-media-query'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTagButton from '@/components/ui-kit/tag-button.vue'
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

const tab_sheet = useTemplateRef('tab_sheet')
// Width-only: matches the template's `max-md:` layout switch. The aside +
// floating preview drop on a narrow viewport, never on a short one.
const is_mobile = useMatchMedia('w<md')

const active_tab = ref<ActiveTab | null>(null)
const tab_outlet = ref<HTMLElement>()

if (initial_tab) active_tab.value = initial_tab
if (initial_side) editor.setActiveSide(initial_side)

const tabs = computed(() => [
  { value: 'design', icon: 'paint-brush', label: t('deck.settings-modal.tab.design') },
  { value: 'study', icon: 'school-cap', label: t('deck.settings-modal.tab.study') },
  { value: 'danger-zone', icon: 'delete', label: t('deck.settings-modal.tab.danger-zone') }
])

// Sourced from TabSheet (the one owner of sidebar visibility), so the default
// tab stays a strict inverse of the sidebar instead of a re-derived condition.
const has_sidebar = computed(() => tab_sheet.value?.has_sidebar ?? false)

const displayed_tab = computed(() => active_tab.value ?? (has_sidebar.value ? 'design' : 'index'))

const sidebar_active = computed({
  get: () => active_tab.value ?? 'design',
  set: (v) => (active_tab.value = v as ActiveTab)
})

const header_title = computed(() => t(`deck.settings-modal.header.${displayed_tab.value}.title`))

const visible_side = computed(() =>
  displayed_tab.value === 'design' ? editor.active_side.value : 'cover'
)

const tab_component = computed(() => TAB_COMPONENTS[displayed_tab.value])

onMounted(() => {
  const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 200))
  idle(() => {
    import('./tab-design/index.vue')
    import('./tab-study/index.vue')
    import('./tab-danger-zone/index.vue')
    import('./tab-index/index.vue')
  })
})

function onPreviewSide(side: CardSide) {
  if (displayed_tab.value !== 'design') return
  editor.setActiveSide(side)
}

async function onSave() {
  const saved = await editor.saveDeck()
  if (saved) close(true)
}

function onBack() {
  emitSfx('ui.select')
  active_tab.value = null
}

function onTabLeave(el: Element, done: () => void) {
  if (!is_mobile.value || !tab_outlet.value) {
    fadeLeave(el, done)
    return
  }
  tabHeightLeave(tab_outlet.value)(el, done)
}

function onTabEnter(el: Element, done: () => void) {
  if (!is_mobile.value || !tab_outlet.value) {
    fadeEnter(el, done)
    return
  }
  tabHeightEnter(tab_outlet.value)(el, done)
}

watch(has_sidebar, (visible) => {
  if (!visible && active_tab.value === 'danger-zone') active_tab.value = null
})

// Leaving a tab (back to the index) resets the designer side to cover — assign
// directly rather than via setActiveSide so it doesn't fire the slide sfx.
watch(active_tab, (tab) => {
  if (tab === null) editor.active_side.value = 'cover'
})
</script>

<template>
  <tab-sheet
    ref="tab_sheet"
    data-testid="deck-settings-container"
    data-theme="green-500"
    data-theme-dark="green-800"
    class="w-full! max-w-205.5 lg:pointer-fine:max-w-none lg:pointer-fine:w-248! md:h-172 max-md:[--sheet-px:2rem]"
    :tabs="tabs"
    :pattern_config="{ pattern: 'endless-clouds' }"
    :parts="{ content: 'flex gap-14 h-full items-start' }"
    hover_sfx="ui.click_07"
    v-model:active="sidebar_active"
    @close="close(false)"
  >
    <template #header-content>
      <div
        data-testid="deck-settings__header"
        class="w-full flex flex-col max-md:items-center max-md:text-center pointer-coarse:pt-4"
      >
        <h1 data-testid="deck-settings__header-title" class="text-5xl text-white">
          {{ header_title }}
        </h1>
      </div>
    </template>

    <div
      ref="tab_outlet"
      data-testid="deck-settings__main"
      class="relative flex flex-1 flex-col gap-4 w-full min-w-0 max-md:max-w-111 max-md:mx-auto max-md:overflow-hidden"
    >
      <transition :css="false" mode="out-in" @leave="onTabLeave" @enter="onTabEnter">
        <component :is="tab_component" :key="displayed_tab" @navigate="active_tab = $event" />
      </transition>
    </div>

    <deck-aside
      v-if="!is_mobile"
      data-testid="deck-settings__aside"
      :deck="deck"
      class="w-78.5 shrink-0 self-end pt-70"
    />

    <template #overlay>
      <transition
        :css="false"
        @enter="(el, done) => slideFadeRightEnter(el, done)"
        @leave="(el, done) => slideFadeRightLeave(el, done)"
      >
        <ui-tag-button
          v-if="!has_sidebar && active_tab !== null"
          data-testid="deck-settings__back-button"
          :aria-label="t('deck.settings-modal.back-button')"
          data-theme="yellow-500"
          data-theme-dark="yellow-700"
          class="pointer-events-auto absolute! left-(--sheet-px) top-29 drop-shadow-xs"
          @click="onBack"
        >
          <ui-icon src="arrow-back" class="w-4 h-4" />
          <span>{{ t('deck.settings-modal.back-label') }}</span>
        </ui-tag-button>
      </transition>

      <div
        v-if="!is_mobile"
        data-testid="deck-settings__floating-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <div class="relative">
          <card
            size="xl"
            class="absolute! -top-2 right-1"
            face_classes="bg-white! dark:bg-stone-700!"
          />

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

    <template #footer>
      <ui-button
        v-if="editor.is_dirty.value"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="xl"
        full-width
        @click="onSave"
      >
        {{ t('deck.settings-modal.submit-edit') }}
      </ui-button>
    </template>
  </tab-sheet>
</template>
