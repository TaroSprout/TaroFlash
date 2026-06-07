<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useInsertCardAtMutation } from '@/api/cards'
import { useToast } from '@/composables/toast'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import textEditor from '@/components/text-editor/text-editor.vue'

type AddCardModalProps = {
  front: string
  back: string
  close: (response?: boolean) => void
}

const { front, back, close } = defineProps<AddCardModalProps>()

const { t } = useI18n()
const toast = useToast()
const insert_card = useInsertCardAtMutation()

const { data: decks_data } = useMemberDecksQuery()

// Seeded from the props once; the text-editor is uncontrolled, so these refs are
// the source of truth from mount onward and carry whatever the user edits.
const front_text = ref(front)
const back_text = ref(back)
const deck_id = ref<number | null>(null)
const saving = ref(false)

const decks = computed(() => decks_data.value ?? [])
const can_save = computed(
  () =>
    deck_id.value !== null &&
    front_text.value.trim().length > 0 &&
    back_text.value.trim().length > 0
)

async function onSave() {
  if (!can_save.value || deck_id.value === null) return

  saving.value = true
  try {
    await insert_card.mutateAsync({
      deck_id: deck_id.value,
      anchor_id: null,
      side: null,
      front_text: front_text.value,
      back_text: back_text.value
    })
    toast.success(t('audio-reader.add-card-modal.success'))
    close(true)
  } catch {
    toast.error(t('audio-reader.add-card-modal.error'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <mobile-sheet
    data-testid="add-card-modal"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    class="sm:w-160"
    :title="t('audio-reader.add-card-modal.title')"
    @close="close(false)"
  >
    <div data-testid="add-card-modal__body" class="flex flex-col gap-5 p-6">
      <div data-testid="add-card-modal__faces" class="flex flex-col gap-4 sm:flex-row">
        <div data-testid="add-card-modal__front" class="flex flex-1 flex-col gap-2">
          <span class="text-base text-brown-700 dark:text-grey-300">
            {{ t('audio-reader.add-card-modal.front-label') }}
          </span>
          <div
            class="h-40 rounded-5 bg-brown-100 p-4 dark:bg-grey-800 [--color-brown-300:var(--color-brown-400)]"
          >
            <text-editor
              :content="front_text"
              :placeholder="t('audio-reader.add-card-modal.front-placeholder')"
              @update="front_text = $event"
            />
          </div>
        </div>

        <div data-testid="add-card-modal__back" class="flex flex-1 flex-col gap-2">
          <span class="text-base text-brown-700 dark:text-grey-300">
            {{ t('audio-reader.add-card-modal.back-label') }}
          </span>
          <div
            class="h-40 rounded-5 bg-brown-100 p-4 dark:bg-grey-800 [--color-brown-300:var(--color-brown-400)]"
          >
            <text-editor
              :content="back_text"
              :placeholder="t('audio-reader.add-card-modal.back-placeholder')"
              @update="back_text = $event"
            />
          </div>
        </div>
      </div>

      <select
        data-testid="add-card-modal__deck"
        v-model="deck_id"
        class="rounded-5 bg-brown-100 px-3 py-2 text-base text-brown-700 dark:bg-grey-800 dark:text-brown-200"
      >
        <option :value="null" disabled>
          {{ t('audio-reader.add-card-modal.deck-placeholder') }}
        </option>
        <option v-for="deck in decks" :key="deck.id" :value="deck.id">{{ deck.title }}</option>
      </select>

      <div data-testid="add-card-modal__actions" class="flex gap-3">
        <ui-button
          data-theme="grey-400"
          icon-left="close"
          size="lg"
          full-width
          :disabled="saving"
          @click="close(false)"
        >
          {{ t('audio-reader.add-card-modal.cancel-button') }}
        </ui-button>

        <ui-button
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="add"
          size="lg"
          full-width
          :disabled="!can_save || saving"
          @click="onSave"
        >
          {{ t('audio-reader.add-card-modal.save-button') }}
        </ui-button>
      </div>
    </div>
  </mobile-sheet>
</template>
