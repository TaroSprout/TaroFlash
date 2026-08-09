<script setup lang="ts">
import SessionStudying from './session-studying/index.vue'
import SessionSummary from './session-summary/index.vue'
import SessionSummaryCategory from './session-summary/category-page/index.vue'
import SessionSettings from './session-settings/index.vue'
import SessionHeaderNavButton from './session-header-nav-button.vue'
import SessionHeaderMenu from './session-header-menu.vue'
import SummarySelectButton from './session-summary/summary-select-button.vue'
import SummaryBulkActionsBar from './session-summary/bulk-actions-bar.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import { emitSfx } from '@/sfx/bus'
import { clearPersistedSession } from './composables/session-persistence'
import { provideStudySessionController } from './composables/session-controller'
import { useModalRequestClose } from '@/composables/modal'

const { deck_ids, close } = defineProps<{
  deck_ids: number[]
  close: () => void
}>()

const { t } = useI18n()

const {
  state,
  results,
  is_cover,
  can_edit,
  sessionDecks,
  active_page,
  summary_category,
  summary_selection,
  summary_editing_card,
  requestClose,
  startEdit,
  onMove,
  onDelete,
  openSettings,
  closeSettings,
  openSummaryCategory,
  closeSummaryCategory,
  stopSummaryEdit
} = provideStudySessionController({ deck_ids, onClosed })

const summary_seen = ref(false)

const phase = computed<'studying' | 'summary'>(() =>
  state.value === 'summary' ? 'summary' : 'studying'
)

const current_page = computed<'settings' | 'studying' | 'summary' | 'summary-category'>(() => {
  if (active_page.value === 'settings') return 'settings'
  if (summary_category.value) return 'summary-category'
  return phase.value
})

const nav_mode = computed<'close' | 'stop' | 'back'>(() => {
  if (current_page.value === 'settings' || current_page.value === 'summary-category') return 'back'
  if (phase.value === 'summary' || is_cover.value) return 'close'
  return 'stop'
})

// The textured backdrop reads as busy behind the settings form, so drop it there.
const bgx_class = computed(() =>
  active_page.value === 'settings'
    ? ''
    : 'bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-(--color-element-pattern)'
)

const title = computed(() => {
  if (active_page.value === 'settings') return t('study-session.settings.title')
  if (summary_category.value) {
    return t(`session-summary.category.${summary_category.value}-title`)
  }

  return sessionDecks.value.length === 1
    ? (sessionDecks.value[0]?.title ?? '')
    : t('study-session.multiple-decks-title')
})

/** Only on an open category page, and hidden while its editor sub-state is showing. */
const show_summary_select_button = computed(
  () => current_page.value === 'summary-category' && !summary_editing_card.value
)
const show_summary_bulk_bar = computed(
  () => current_page.value === 'summary-category' && summary_selection.is_selecting.value
)

useModalRequestClose(onRequestClose)

/** Early close (close button / backdrop / esc before any review). */
function onClosed() {
  emitSfx('pop_up_close')
  clearPersistedSession()
  close()
}

function onPaneEnterStart() {
  // Only the summary's first arrival gets the session-complete jingle; every other swap gets a light click.
  const enter_sfx = {
    settings: 'snappy_button_3',
    studying: 'snappy_button_2',
    'summary-category': 'snappy_button_3'
  } as const

  if (current_page.value !== 'summary') {
    emitSfx(enter_sfx[current_page.value])
    return
  }

  emitSfx(summary_seen.value ? 'snappy_button_2' : 'music_pizz_duo_hi')
  summary_seen.value = true
}

/** Studying → stop into summary (or dismiss on the cover); summary → dismiss. */
function leaveSession() {
  if (phase.value === 'studying') requestClose()
  else onClosed()
}

/** Header nav button. Back returns to the session; otherwise leaves it. */
function onHeaderStop() {
  if (active_page.value === 'settings') {
    closeSettings()
    return
  }

  if (summary_editing_card.value) {
    stopSummaryEdit()
    return
  }

  if (summary_category.value) {
    closeSummaryCategory()
    return
  }

  leaveSession()
}

/**
 * Backdrop / esc. On the settings page it dismisses a not-yet-started session
 * (still on the cover) but returns to an in-progress one; a summary card's
 * editor returns to its category page, and a category page returns to the
 * stats list; elsewhere it leaves the session as usual.
 */
function onRequestClose() {
  if (active_page.value === 'settings') {
    if (is_cover.value) onClosed()
    else closeSettings()
    return
  }

  if (summary_editing_card.value) {
    stopSummaryEdit()
    return
  }

  if (summary_category.value) {
    closeSummaryCategory()
    return
  }

  leaveSession()
}

/**
 * Header Select/Done. Enters or leaves the category page's multi-select —
 * same sfx pair as the deck-view select/cancel seam (`actions.ts`
 * `onSelectCard`/`onCancelSelection`), just combined into one toggle here
 * since the header only has a single button for both directions.
 */
function onToggleSummarySelecting() {
  if (summary_selection.is_selecting.value) {
    emitSfx('digi_powerdown')
    summary_selection.exitSelection()
  } else {
    emitSfx('select')
    summary_selection.enterSelection()
  }
}
</script>

<template>
  <dialog-card data-testid="study-session" :class="bgx_class" size="lg" :title="title">
    <template #header-start>
      <session-header-nav-button :mode="nav_mode" @press="onHeaderStop" />
    </template>

    <template v-if="phase === 'studying' && active_page !== 'settings'" #header-end>
      <session-header-menu
        :can_edit="can_edit"
        @edit="startEdit"
        @move="onMove"
        @delete="onDelete"
        @settings="openSettings"
      />
    </template>
    <template v-else-if="show_summary_select_button" #header-end>
      <summary-select-button
        :is_selecting="summary_selection.is_selecting.value"
        @press="onToggleSummarySelecting"
      />
    </template>

    <template #default>
      <div data-testid="study-session__outlet" class="relative w-full h-full">
        <dialog-card-pager
          :instant="current_page !== 'summary' || summary_seen"
          @enter-start="onPaneEnterStart"
        >
          <session-settings
            v-if="current_page === 'settings'"
            key="settings"
            class="absolute inset-0 z-10"
          />
          <session-studying v-else-if="current_page === 'studying'" key="studying" />
          <session-summary-category
            v-else-if="summary_category"
            key="summary-category"
            class="absolute inset-0 z-10"
            :results="results"
            :category="summary_category"
          />
          <session-summary
            v-else
            key="summary"
            class="absolute inset-0 z-10"
            :results="results"
            @open-category="openSummaryCategory"
          />
        </dialog-card-pager>
      </div>
    </template>

    <template v-if="current_page === 'summary'" #toolbar>
      <ui-button
        neutral
        data-testid="session-summary__close"
        full-width
        size="xl"
        class="mx-auto max-w-95"
        :sfx="{ press: 'slide_up' }"
        @press="onClosed"
      >
        {{ t('session-summary.close-button') }}
      </ui-button>
    </template>
    <template v-else-if="show_summary_bulk_bar" #toolbar>
      <summary-bulk-actions-bar />
    </template>
  </dialog-card>
</template>
