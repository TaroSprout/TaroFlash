<script setup lang="ts">
import SessionStudying from './session-studying/index.vue'
import SessionSummary from './session-summary/index.vue'
import SessionSettings from './session-settings/index.vue'
import SessionHeaderNavButton from './session-header-nav-button.vue'
import SessionHeaderMenu from './session-header-menu.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
  requestClose,
  startEdit,
  onMove,
  onDelete,
  openSettings,
  closeSettings
} = provideStudySessionController({ deck_ids, onClosed })

const phase = computed<'studying' | 'summary'>(() =>
  state.value === 'summary' ? 'summary' : 'studying'
)

const current_page = computed<'settings' | 'studying' | 'summary'>(() =>
  active_page.value === 'settings' ? 'settings' : phase.value
)

const nav_mode = computed<'close' | 'stop' | 'back'>(() => {
  if (active_page.value === 'settings') return 'back'
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

  return sessionDecks.value.length === 1
    ? (sessionDecks.value[0]?.title ?? '')
    : t('study-session.multiple-decks-title')
})

useModalRequestClose(onRequestClose)

/** Early close (close button / backdrop / esc before any review). */
function onClosed() {
  emitSfx('pop_up_close')
  clearPersistedSession()
  close()
}

function onPaneEnterStart() {
  // Summary keeps the session-complete jingle; the settings/studying swap gets
  // a light click, distinct per direction.
  const enter_sfx = {
    settings: 'snappy_button_3',
    studying: 'snappy_button_2',
    summary: 'music_pizz_duo_hi'
  } as const
  emitSfx(enter_sfx[current_page.value])
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

  leaveSession()
}

/**
 * Backdrop / esc. On the settings page it dismisses a not-yet-started session
 * (still on the cover) but returns to an in-progress one; elsewhere it leaves
 * the session as usual.
 */
function onRequestClose() {
  if (active_page.value === 'settings') {
    if (is_cover.value) onClosed()
    else closeSettings()
    return
  }

  leaveSession()
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

    <template #default>
      <div data-testid="study-session__outlet" class="relative w-full h-full">
        <dialog-card-pager :instant="current_page !== 'summary'" @enter-start="onPaneEnterStart">
          <session-settings
            v-if="current_page === 'settings'"
            key="settings"
            class="absolute inset-0 z-10"
          />
          <session-studying v-else-if="current_page === 'studying'" key="studying" />
          <session-summary
            v-else
            key="summary"
            class="absolute inset-0 z-10"
            :results="results"
            @close="onClosed"
          />
        </dialog-card-pager>
      </div>
    </template>
  </dialog-card>
</template>
