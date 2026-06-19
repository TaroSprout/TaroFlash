<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMemberDecksQuery } from '@/api/decks'
import { useToast } from '@/composables/toast'
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import ReviewInbox from './review-inbox.vue'
import AudioReaderSection from './audio-reader-section.vue'
import { useDeckCreateModal } from '@/composables/deck/create-modal'
import { useDeckActions } from '@/composables/deck/actions'
import { useCan } from '@/composables/can'
import MemberBadge from '@/components/member/member-badge.vue'
import { useMemberStore } from '@/stores/member'
import { usePhoneOS } from '@/phone/system/os'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const is_md = useMatchMedia('w>=md')
const can = useCan()
const member_store = useMemberStore()
const phone = usePhoneOS()

const deck_create_modal = useDeckCreateModal()
const deck_actions = useDeckActions()
const { data: decks_data, error: decks_error } = useMemberDecksQuery()
const decks = computed(() => decks_data.value ?? [])
watch(decks_error, (err) => {
  if (err) toast.error(err.message)
})

const due_decks = computed(() => {
  return decks.value.filter((deck) => (deck.due_count ?? 0) > 0)
})

const total_due = computed(() => due_decks.value.reduce((sum, d) => sum + (d.due_count ?? 0), 0))

const show_inbox = ref(true)

function onBadgeClick() {
  show_inbox.value = !show_inbox.value
}

function onEditClick() {
  phone.value?.openByTitle('Settings')
}

function onDeckClicked(deck: Deck) {
  router.push({ name: 'deck', params: { id: deck.id } })
}

async function onCreateDeckClicked() {
  if (await deck_actions.guardCreateDeck()) {
    deck_create_modal.open()
  }
}
</script>

<template>
  <div
    data-testid="dashboard"
    class="grid grid-cols-[1fr] md:grid-cols-[345px_1fr] gap-x-15.5 pb-12"
  >
    <div data-testid="dashboard__left-column" class="flex flex-col gap-6 self-start">
      <div
        data-testid="dashboard__member-section"
        class="relative flex flex-col gap-3 max-md:hidden"
      >
        <member-badge
          :display-name="member_store.display_name"
          :description="member_store.description"
          :sfx="{ hover: 'ui.tap_05', press: 'ui.snappy_button_5' }"
          @click="onBadgeClick"
        >
          <template #description>
            <div
              data-testid="member-badge__cards-due"
              class="border-t-2 border-brown-100 pt-1 mt-0.5 text-xl text-brown-100"
            >
              <span class="bg-brown-100 text-(--theme-primary) px-1 py-0.5 -rotate-5 rounded-1.5">{{
                total_due
              }}</span>
              {{ t('dashboard.cards-due.cards-label', total_due) }}
              {{ due_decks.length }}
              {{ t('dashboard.cards-due.decks-label', due_decks.length) }}
            </div>
          </template>
          <template #actions>
            <ui-button
              data-testid="member-badge__edit-button"
              icon-left="edit"
              class="absolute! -top-1 -right-1 ring-4 ring-(--theme-primary)"
              icon-only
              inverted
              @click.stop="onEditClick"
            >
              {{ t('member-badge.edit-button') }}
            </ui-button>
          </template>
        </member-badge>

        <template v-if="show_inbox">
          <div
            data-testid="dashboard__binder-rings"
            class="absolute top-[118px] z-10 w-full flex justify-between px-14"
          >
            <div
              class="h-8 w-[17px] rounded-full bg-brown-500 ring-3 ring-brown-100 dark:ring-grey-900"
            />
            <div
              class="h-8 w-[17px] rounded-full bg-brown-500 ring-3 ring-brown-100 dark:ring-grey-900"
            />
          </div>

          <review-inbox :due_decks="due_decks" />
        </template>
      </div>

      <ui-button
        icon-left="add"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        class="w-full!"
        size="xl"
        @click="onCreateDeckClicked"
      >
        {{ t('dashboard.create-deck-button') }}
      </ui-button>
    </div>

    <div data-testid="dashboard__right-column" class="flex flex-col gap-y-5">
      <h1
        class="text-brown-700 dark:text-brown-300 text-4xl self-start relative text-nowrap w-min after:absolute after:-right-2 after:bottom-0 after:-left-2 after:rounded-1.5 after:h-4 after:-z-1 after:bg-brown-300 dark:after:bg-grey-700"
      >
        {{ t('dashboard.deck-filter.all-label') }}
      </h1>

      <div data-testid="dashboard__main-column" class="flex flex-col gap-y-20 self-start">
        <div data-testid="dashboard__decks" class="flex gap-x-6.5 gap-y-8 flex-wrap">
          <DeckThumbnail
            v-for="(deck, index) in decks"
            :key="index"
            :deck="deck"
            :size="is_md ? 'base' : 'sm'"
            @click="onDeckClicked(deck)"
          />
        </div>

        <audio-reader-section v-if="can.useAudioReader.value" />
      </div>
    </div>
  </div>
</template>
