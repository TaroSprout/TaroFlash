<script setup lang="ts">
import SessionStudying from './session-studying/index.vue'
import SessionSummary from './session-summary/index.vue'
import SessionSummaryCategory from './session-summary/category-page/index.vue'
import SessionSettings from './session-settings/index.vue'
import SessionHeaderNavButton from './session-header-nav-button.vue'
import SessionHeaderMenu from './session-header-menu.vue'
import SessionProgress from './session-studying/session-progress.vue'
import RatingButtons from './session-studying/rating-buttons/index.vue'
import StudyFlipDoneFooter from './study-flip-done-footer.vue'
import SummarySelectButton from './session-summary/summary-select-button.vue'
import SummaryBulkActionsBar from './session-summary/bulk-actions-bar.vue'
import { computed, ref, useTemplateRef } from 'vue'
import { type Grade } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardPager from '@/components/layout-kit/dialog-card/dialog-card-pager.vue'
import { emitSfx } from '@/sfx/bus'
import { toolbarEnter, toolbarLeave } from '@/utils/animations/toolbar-swap'
import { clearPersistedSession } from './composables/session-persistence'
import { provideStudySessionController } from './composables/session-controller'
import { providePrimedGrade } from './session-studying/card/primed-grade-context'
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
  editing,
  sessionDecks,
  active_page,
  summary_category,
  summary_selection,
  summary_editing_card,
  prefs_are_default,
  requestClose,
  startSession,
  startEdit,
  flipCurrentCard,
  stopEdit,
  onMove,
  onDelete,
  openSettings,
  closeSettings,
  resetToDefaults,
  openSummaryCategory,
  closeSummaryCategory,
  stopSummaryEdit
} = provideStudySessionController({ deck_ids, onClosed })

const primed_grade = ref<Grade | null>(null)
providePrimedGrade(primed_grade)

const summary_seen = ref(false)

const studying_pane = useTemplateRef('studying_pane')
const summary_category_pane = useTemplateRef('summary_category_pane')

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

/** The textured backdrop reads as busy behind the settings form, so drop it there. */
const bgx_class = computed(() =>
  active_page.value === 'settings'
    ? ''
    : 'bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-(--color-raised-pattern)'
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

/** Which control set fills the session window's bottom row. */
const toolbar_variant = computed<
  | 'rating'
  | 'edit'
  | 'settings-reset'
  | 'summary-edit'
  | 'bulk'
  | 'category-close'
  | 'summary-close'
>(() => {
  if (current_page.value === 'settings') return 'settings-reset'

  if (current_page.value === 'summary-category') {
    if (summary_editing_card.value) return 'summary-edit'
    return show_summary_bulk_bar.value ? 'bulk' : 'category-close'
  }

  if (current_page.value === 'summary') return 'summary-close'

  return editing.value ? 'edit' : 'rating'
})

useModalRequestClose(onRequestClose)

/** Early close (close button / backdrop / esc before any review). */
function onClosed() {
  emitSfx('dialog.close')
  clearPersistedSession()
  close()
}

function onPaneEnterStart() {
  // Only the summary's first arrival gets the session-complete jingle; every other swap gets a light click.
  const enter_sfx = {
    settings: 'dialog.open',
    studying: 'ui.press',
    'summary-category': 'dialog.open'
  } as const

  if (current_page.value !== 'summary') {
    emitSfx(enter_sfx[current_page.value])
    return
  }

  emitSfx(summary_seen.value ? 'ui.press' : 'session.complete')
  summary_seen.value = true
}

/** Rating buttons prime a grade; the fling animation runs on the card stage. */
function onRated(grade: Grade) {
  studying_pane.value?.rate(grade)
}

/** The session footer's Flip button, for a summary category card being edited. */
function onFlipSummaryEditingCard() {
  summary_category_pane.value?.flipEditingCard()
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
    emitSfx('ui.deselect')
    summary_selection.exitSelection()
  } else {
    emitSfx('ui.select')
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

    <template #header-after>
      <session-progress
        class="absolute inset-x-0 top-0"
        :class="{ invisible: current_page !== 'studying' }"
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
          <session-studying
            v-else-if="current_page === 'studying'"
            key="studying"
            ref="studying_pane"
          />
          <session-summary-category
            v-else-if="summary_category"
            key="summary-category"
            ref="summary_category_pane"
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

    <template #toolbar>
      <div class="relative w-full">
        <Transition :css="false" @enter="toolbarEnter" @leave="toolbarLeave">
          <rating-buttons
            v-if="toolbar_variant === 'rating'"
            key="rating"
            class="mx-auto max-w-117"
            @started="startSession"
            @rated="onRated"
          />
          <study-flip-done-footer
            v-else-if="toolbar_variant === 'edit'"
            key="edit"
            @flip="flipCurrentCard"
            @done="stopEdit"
          />
          <ui-button
            v-else-if="toolbar_variant === 'settings-reset'"
            key="settings-reset"
            neutral
            data-testid="session-settings__reset"
            icon-left="refresh"
            full-width
            size="xl"
            class="mx-auto max-w-95"
            :disabled="prefs_are_default"
            :sfx="{ press: 'ui.press' }"
            @press="resetToDefaults"
          >
            {{ t('study-session.settings.reset-button') }}
          </ui-button>
          <study-flip-done-footer
            v-else-if="toolbar_variant === 'summary-edit'"
            key="summary-edit"
            @flip="onFlipSummaryEditingCard"
            @done="stopSummaryEdit"
          />
          <summary-bulk-actions-bar v-else-if="toolbar_variant === 'bulk'" key="bulk" />
          <ui-button
            v-else-if="toolbar_variant === 'category-close'"
            key="category-close"
            neutral
            data-testid="session-summary-category__close"
            full-width
            size="xl"
            class="mx-auto max-w-95"
            :sfx="{ press: 'nav.page-forward' }"
            @press="onClosed"
          >
            {{ t('session-summary.close-button') }}
          </ui-button>
          <ui-button
            v-else
            key="summary-close"
            neutral
            data-testid="session-summary__close"
            full-width
            size="xl"
            class="mx-auto max-w-95"
            :sfx="{ press: 'nav.page-forward' }"
            @press="onClosed"
          >
            {{ t('session-summary.close-button') }}
          </ui-button>
        </Transition>
      </div>
    </template>
  </dialog-card>
</template>
