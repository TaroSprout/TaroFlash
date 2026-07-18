<script setup lang="ts">
import { computed, onMounted, provide, ref, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import DeckAside from './deck-aside.vue'
import DeckSaveButton from './deck-save-button.vue'
import { deckSettingsCloseKey } from './layout'
import { useWindowChrome } from './window-chrome'
import { emitSfx } from '@/sfx/bus'
import { useDeckEditor, deckEditorKey } from '@/composables/deck/editor'
import { useDeckDangerActions, deckDangerActionsKey } from '@/composables/deck/danger-actions'
import type { WindowLayout } from '@/components/layout-kit/paged-window/layout'
import { useAlert } from '@/composables/alert'
import { useModalAfterEnter, useModalRequestClose } from '@/composables/modal'
import DeckPinnedPreview from '@/components/deck/pinned-preview.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import PagedWindow, {
  type PagedWindowGroup,
  type Page
} from '@/components/layout-kit/paged-window/index.vue'
import TabDetails from './tab-details/index.vue'
import TabDesign from './tab-design/index.vue'
import TabReviewPacing from './tab-review-pacing/index.vue'
import TabReviewHistory from './tab-review-history/index.vue'
import TabDangerZone from './tab-danger-zone/index.vue'
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
  details: TabDetails,
  design: TabDesign,
  'review-pacing': TabReviewPacing,
  'review-history': TabReviewHistory,
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

const active_tab = ref<ActiveTab | null>(initial_tab ?? null)

const pager = useTemplateRef<{ layout_mode: WindowLayout; displayed_page: string }>('pager')
const active_tab_ref = useTemplateRef<{ onChromeBack?: () => boolean }>('active_tab_ref')

const preview_el = useTemplateRef<HTMLElement>('preview_el')
const aside_instance = useTemplateRef<ComponentPublicInstance>('aside_instance')
const aside_el = computed(() => aside_instance.value?.$el as HTMLElement | undefined)

const chrome = useWindowChrome(preview_el, aside_el)

const layout_mode = computed<WindowLayout>(() => pager.value?.layout_mode ?? 'phone')
const displayed_page = computed(() => pager.value?.displayed_page ?? 'directory')
provide(deckSettingsCloseKey, close)

const pages = computed<Page[]>(() =>
  (Object.keys(TAB_META) as TabValue[]).map((value) => ({
    value,
    icon: TAB_META[value].icon,
    label: t(TAB_META[value].labelKey),
    danger: value === 'danger-zone',
    sidebar: value !== 'details'
  }))
)

const groups = computed<PagedWindowGroup[]>(() => [
  {
    key: 'appearance',
    heading: t('deck.settings-modal.index.general-heading'),
    entries:
      layout_mode.value === 'phone'
        ? ['details', 'design', 'danger-zone']
        : ['design', 'danger-zone']
  },
  {
    key: 'review-pacing',
    heading: t('deck.settings-modal.index.review-pacing-heading'),
    entries: ['review-pacing', 'review-history']
  }
])

const header_title = computed(() => deck.title || t('deck.settings-modal.title'))

const visible_side = computed(() =>
  displayed_page.value === 'design' ? editor.active_side.value : 'cover'
)

// Phone mode has no pinned preview or aside to clear away, so full-bleed is a
// desktop/tablet-only concern.
const is_full_bleed = computed(
  () =>
    layout_mode.value !== 'phone' && Boolean(TAB_META[displayed_page.value as TabValue]?.full_bleed)
)

onMounted(async () => {
  if (initial_side) {
    await after_enter
    editor.setActiveSide(initial_side)
  }
})

function runChromeSync() {
  return is_full_bleed.value ? chrome.tuck() : chrome.restore()
}

function onPreviewSide(side: CardSide) {
  if (displayed_page.value !== 'design') return
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

function onBack() {
  emitSfx('snappy_button_5')
  active_tab.value = null
}

function onChromeBack() {
  if (active_tab_ref.value?.onChromeBack?.()) {
    emitSfx('snappy_button_5')
    return
  }
  onBack()
}

// Leaving a tab (back to the index) resets the designer side to cover — assign
// directly rather than via setActiveSide so it doesn't fire the slide sfx.
watch(active_tab, (tab) => {
  if (tab === null) editor.active_side.value = 'cover'
})

// The preview and aside unmount at the phone boundary and remount in their
// untucked poses on the way back, dropping the imperative tuck styling — so
// whenever they (re)appear, snap the chrome to the pose the displayed tab
// demands. This also covers first mount: a sheet opened straight onto a
// full-bleed tab starts with the chrome already gone rather than animating it
// away in front of the user.
watch([preview_el, aside_el], ([preview]) => {
  if (preview) chrome.snap(is_full_bleed.value)
})
</script>

<template>
  <paged-window
    ref="pager"
    data-testid="deck-settings-container"
    data-theme="green-500"
    data-theme-dark="green-800"
    :data-layout="layout_mode"
    :class="[
      layout_mode === 'desktop' ? 'w-237!' : 'w-full! max-w-205.5',
      layout_mode !== 'phone' && 'h-181.5',
      layout_mode === 'phone'
        ? '[--deck-settings-padding:var(--window-px)]'
        : '[--deck-settings-padding:0px]',
      chrome.is_tucked.value && '[--window-overlay-z:15]'
    ]"
    :pages="pages"
    :groups="groups"
    :stretch_page="is_full_bleed"
    :pattern_config="{ pattern: 'endless-clouds' }"
    :between="runChromeSync"
    v-model:active="active_tab"
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

    <template #default="{ displayed_page: page }">
      <component :is="TAB_COMPONENTS[page as TabValue]" ref="active_tab_ref" />
    </template>

    <template #scrollbar>
      <scroll-bar
        v-if="layout_mode !== 'phone'"
        data-theme="brown-200"
        target="[data-testid='paged-window__main']"
        class="absolute top-2 bottom-4 right-0"
        :class="layout_mode === 'tablet' && 'right-9'"
      />
    </template>

    <template #aside>
      <deck-aside
        v-if="layout_mode !== 'phone'"
        ref="aside_instance"
        data-testid="deck-settings__aside"
        class="w-92 shrink-0 self-end pb-8"
        :class="layout_mode === 'tablet' ? 'pt-66 pr-22' : 'pt-70 px-8'"
      />
    </template>

    <template #directory-footer>
      <deck-save-button v-if="layout_mode === 'phone'" />
    </template>

    <template #overlay>
      <div
        v-if="layout_mode !== 'phone'"
        ref="preview_el"
        data-testid="deck-settings__pinned-preview"
        :data-tucked="chrome.is_tucked.value"
        class="absolute right-(--window-px) top-6"
        :class="chrome.is_tucked.value ? 'pointer-events-none' : 'pointer-events-auto'"
      >
        <deck-pinned-preview
          :cover="editor.draft.cover_config"
          :card_attributes="editor.draft.card_attributes"
          :side="visible_side"
          :tucked="chrome.is_tucked.value"
          :front_text="editor.preview_front_text.value"
          :back_text="editor.preview_back_text.value"
          @update:side="onPreviewSide"
        />
      </div>
    </template>
  </paged-window>
</template>
