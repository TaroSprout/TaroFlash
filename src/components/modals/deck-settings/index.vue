<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, provide, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DeckAside from './deck-aside.vue'
import { emitSfx } from '@/sfx/bus'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import {
  slideFadeRightEnter,
  slideFadeRightLeave,
  tabSlideRightEnter,
  tabSlideRightLeave
} from '@/utils/animations/slide-fade-right'
import { tabHeightEnter, tabHeightLeave } from '@/utils/animations/tab-height'
import { useDeckEditor, deckEditorKey } from '@/composables/deck-editor'
import {
  useDeckDangerActions,
  deckDangerActionsKey
} from '@/composables/deck/use-deck-danger-actions'
import { useMatchMedia } from '@/composables/use-media-query'
import { useAlert } from '@/composables/alert'
import { useModalAfterEnter, useModalRequestClose } from '@/composables/modal'
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

const alert = useAlert()
useModalRequestClose(() => onClose())
const after_enter = useModalAfterEnter()

const deck_aside = useTemplateRef('deck_aside')
// Layout modes — single source of truth for all layout-conditional rendering.
// is_mobile:       w < md  → no aside, no floating preview, height-animated tab transitions
// is_desktop_fine: w >= lg & fine pointer → sidebar + floating preview, wider modal
// Everything else (tablet, coarse desktop) uses the intermediate/tablet layout.
const is_mobile = useMatchMedia('w<md')
const is_desktop_fine = useMatchMedia('w>=lg & fine')

const active_tab = ref<ActiveTab | null>(null)
const tab_outlet = ref<HTMLElement>()
const is_saving = ref(false)
const is_tab_transitioning = ref(false)
let nav_direction: 'forward' | 'back' | null = null

const sheet_px = computed(() => {
  if (is_mobile.value || is_desktop_fine.value) return '2rem'
  return '4.5rem'
})

if (initial_tab) active_tab.value = initial_tab

const tabs = computed(() => [
  { value: 'design', icon: 'paint-brush', label: t('deck.settings-modal.tab.design') },
  { value: 'study', icon: 'school-cap', label: t('deck.settings-modal.tab.study') },
  { value: 'danger-zone', icon: 'delete', label: t('deck.settings-modal.tab.danger-zone') }
])

const displayed_tab = computed(
  () => active_tab.value ?? (is_desktop_fine.value ? 'design' : 'index')
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

async function onSave() {
  if (deck_aside.value && !deck_aside.value.validate()) {
    emitSfx('ui.etc_woodblock_stuck')
    return
  }
  is_saving.value = true
  const saved = await editor.saveDeck()
  is_saving.value = false
  if (saved) close(true)
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

function onBack() {
  emitSfx('ui.select')
  active_tab.value = null
}

function onTabLeave(el: Element, done: () => void) {
  if (!is_mobile.value || !tab_outlet.value) {
    fadeLeave(el, done)
    return
  }
  if (nav_direction === 'back') {
    tabSlideRightLeave(tab_outlet.value)(el, done)
    return
  }
  tabHeightLeave(tab_outlet.value)(el, done)
}

function onTabEnter(el: Element, done: () => void) {
  const finish = () => {
    is_tab_transitioning.value = false
    done()
  }
  if (!is_mobile.value || !tab_outlet.value) {
    fadeEnter(el, finish)
    return
  }
  if (nav_direction === 'forward') {
    tabSlideRightEnter(tab_outlet.value)(el, finish)
    return
  }
  tabHeightEnter(tab_outlet.value)(el, finish)
}

watch(is_desktop_fine, (visible) => {
  if (!visible && active_tab.value === 'danger-zone') active_tab.value = null
})

// Leaving a tab (back to the index) resets the designer side to cover — assign
// directly rather than via setActiveSide so it doesn't fire the slide sfx.
watch(active_tab, (tab) => {
  if (tab === null) editor.active_side.value = 'cover'
})

// Sync flush ensures the flag is true before Vue re-renders, so the footer
// button mounts already invisible rather than flashing then fading.
watch(
  active_tab,
  (tab, prev) => {
    is_tab_transitioning.value = true
    nav_direction = tab !== null && prev === null ? 'forward' : tab === null ? 'back' : null
  },
  { flush: 'sync' }
)
</script>

<template>
  <tab-sheet
    data-testid="deck-settings-container"
    data-theme="green-500"
    data-theme-dark="green-800"
    :class="is_desktop_fine ? 'w-248!' : 'w-full! max-w-205.5'"
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
        is_mobile && 'max-w-111 mx-auto overflow-hidden'
      ]"
    >
      <transition :css="false" mode="out-in" @leave="onTabLeave" @enter="onTabEnter">
        <component :is="tab_component" :key="displayed_tab" @navigate="active_tab = $event" />
      </transition>
    </div>

    <deck-aside
      v-if="!is_mobile"
      ref="deck_aside"
      data-testid="deck-settings__aside"
      :loading="is_saving"
      class="w-78.5 shrink-0 self-end pt-70"
      @save="onSave"
    />

    <template #overlay>
      <transition
        :css="false"
        @enter="(el, done) => slideFadeRightEnter(el, done)"
        @leave="(el, done) => slideFadeRightLeave(el, done)"
      >
        <ui-tag-button
          v-if="!is_desktop_fine && active_tab !== null"
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

    <template #footer>
      <div
        v-if="is_mobile && active_tab !== null"
        data-testid="deck-settings__footer"
        :data-transitioning="is_tab_transitioning || undefined"
        class="px-(--sheet-px) py-4 transition-opacity duration-100"
        :class="is_tab_transitioning ? 'opacity-0' : 'opacity-100'"
      >
        <ui-button
          data-testid="deck-settings__footer-save-button"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          size="lg"
          full-width
          :loading="is_saving"
          :disabled="!editor.is_dirty.value"
          :sfx="{ click: 'ui.snappy_button_2' }"
          click-when-disabled
          @click="editor.is_dirty.value ? onSave() : emitSfx('ui.digi_powerdown')"
        >
          {{ t('deck.settings-modal.submit-edit') }}
        </ui-button>
      </div>
    </template>
  </tab-sheet>
</template>
