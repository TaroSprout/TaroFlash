<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMemberDecksQuery } from '@/api/decks'
import { useNoticeStore } from '@/stores/notice-store'
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import NewDeckCard from '@/components/deck/new-deck-card.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import ReviewInbox from './review-inbox.vue'
import AudioReaderSection from './audio-reader-section.vue'
import { useDeckActions } from '@/composables/deck/actions'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useCan } from '@/composables/can'
import MemberBadge from '@/components/member/member-badge.vue'
import { useMemberStore } from '@/stores/member'
import { useLocalRef } from '@/composables/storage/local-ref'
import { randomCoverConfig } from '@/utils/cover'
import { DECK_SETTINGS_DEFAULTS, DECK_CONFIG_DEFAULTS } from '@/utils/deck/defaults'
import { popDeckIn, popDeckOut } from '@/utils/animations/deck-grid'
import {
  actionsSwingBeforeEnter,
  actionsSwingEnter,
  actionsSwingLeave
} from '@/utils/animations/dashboard-actions'

const { t } = useI18n()
const notice = useNoticeStore()
const router = useRouter()
const is_md = useMatchMedia('w>=md')
const can = useCan()
const member_store = useMemberStore()

const deck_actions = useDeckActions()
const deck_settings_modal = useDeckSettingsModal()
const study_session = useStudyModal()
const { data: decks_data, error: decks_error } = useMemberDecksQuery()
const decks = computed(() => {
  return [...(decks_data.value ?? [])].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? '')
  )
})
watch(decks_error, (err) => {
  if (err) notice.error(err.message)
})

const due_decks = computed(() => {
  return decks.value.filter((deck) => (deck.due_count ?? 0) > 0)
})

const study_button_key = computed(() => {
  if (due_decks.value.length === 1) return 'review-inbox.study-button'
  if (due_decks.value.length === 2) return 'review-inbox.study-both-button'
  return 'review-inbox.study-all-button'
})

const show_dashboard_actions = useLocalRef('dashboard.show_dashboard_actions', false)
const creating_deck = ref(false)

function onBadgeClick() {
  if (due_decks.value.length === 0) return
  show_dashboard_actions.value = !show_dashboard_actions.value
}

function onDeckClicked(deck: Deck) {
  router.push({ name: 'deck', params: { id: deck.id } })
}

function onDeckSettingsClicked(deck: Deck) {
  deck_settings_modal.open(deck)
}

function onStudyAll() {
  study_session.start(due_decks.value)
}

async function onCreateDeckClicked() {
  if (creating_deck.value) return
  creating_deck.value = true

  await deck_actions.createDeck({
    title: t('deck.default-title'),
    is_public: DECK_SETTINGS_DEFAULTS.is_public,
    study_config: { study_all_cards: DECK_CONFIG_DEFAULTS.study_all_cards },
    cover_config: randomCoverConfig()
  } as Deck)

  creating_deck.value = false
}
</script>

<template>
  <div
    data-testid="dashboard"
    class="grid grid-cols-[1fr] md:grid-cols-[345px_1fr] gap-x-15.5 gap-y-8 md:gap-y-0 px-(--page-px) pt-(--page-pt) pb-12"
  >
    <div data-testid="dashboard__left-column" class="flex flex-col gap-6 self-start">
      <div data-testid="dashboard__member-section" class="relative flex flex-col gap-3">
        <member-badge
          :display-name="member_store.display_name"
          :description="member_store.description"
          :cover="member_store.cover"
          class="z-10"
          :sfx="{
            hover: 'tap_05',
            press: due_decks.length > 0 ? 'snappy_button_5' : 'digi_powerdown'
          }"
          @click="onBadgeClick"
        >
          <template #actions>
            <button
              v-if="!show_dashboard_actions && due_decks.length > 0"
              data-testid="member-badge__expand-button"
              class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 flex h-5 w-10 cursor-pointer items-center justify-center rounded-full bg-brown-100 text-(--theme-primary) ring-4 ring-(--theme-primary)"
            >
              <ui-icon src="carat-down" class="h-4 w-4" />
            </button>
          </template>
        </member-badge>

        <div
          v-if="show_dashboard_actions && due_decks.length > 0"
          data-testid="dashboard__binder-rings"
          class="absolute top-29.5 z-10 w-full flex justify-between px-14 pointer-events-none"
        >
          <div
            class="h-8 w-4.25 rounded-full bg-brown-500 ring-3 ring-brown-100 dark:ring-grey-900"
          />
          <div
            class="h-8 w-4.25 rounded-full bg-brown-500 ring-3 ring-brown-100 dark:ring-grey-900"
          />
        </div>

        <transition
          :css="false"
          @before-enter="actionsSwingBeforeEnter"
          @enter="actionsSwingEnter"
          @leave="actionsSwingLeave"
        >
          <div v-if="show_dashboard_actions && due_decks.length > 0" style="perspective: 1200px">
            <div
              data-testid="dashboard__actions-panel"
              class="w-full rounded-8 bg-brown-300 dark:bg-stone-900 select-none p-3"
            >
              <ui-button
                size="xl"
                icon-left="book-flip-page"
                data-theme="brown-100"
                data-theme-dark="stone-700"
                class="w-full!"
                @press="onStudyAll"
              >
                {{ t(study_button_key) }}
              </ui-button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div data-testid="dashboard__right-column" class="flex flex-col gap-y-5 min-w-0">
      <review-inbox v-if="due_decks.length > 0" :due_decks="due_decks" />

      <transition-group
        tag="div"
        data-testid="dashboard__decks"
        class="flex gap-x-3 gap-y-8 flex-wrap"
        :css="false"
        @enter="popDeckIn"
        @leave="popDeckOut"
      >
        <DeckThumbnail
          v-for="deck in decks"
          :key="deck.id"
          :deck="deck"
          :size="is_md ? 'base' : 'sm'"
          :sfx="{ press: 'snappy_button_5' }"
          @press="onDeckClicked(deck)"
        >
          <template #corner-action>
            <ui-button
              data-testid="dashboard__deck-settings-button"
              data-theme="blue-500"
              data-theme-dark="blue-650"
              icon-left="build"
              icon-only
              @click.stop
              @press="onDeckSettingsClicked(deck)"
              class="ring-4 ring-brown-100 dark:ring-grey-900"
            >
              {{ t('deck.settings-modal.title') }}
            </ui-button>
          </template>
        </DeckThumbnail>

        <NewDeckCard
          key="new-deck-card"
          :size="is_md ? 'base' : 'sm'"
          :loading="creating_deck"
          @press="onCreateDeckClicked"
        />
      </transition-group>

      <audio-reader-section v-if="can.useAudioReader.value" />
    </div>
  </div>
</template>
