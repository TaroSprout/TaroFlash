<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useInsertCardAtMutation } from '@/api/cards'
import { useToast } from '@/composables/toast'
import UiButton from '@/components/ui-kit/button.vue'

const { front, back } = defineProps<{ front: string; back: string }>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const toast = useToast()
const insert_card = useInsertCardAtMutation()

const { data: decks_data } = useMemberDecksQuery()
const decks = computed(() => decks_data.value ?? [])

const deck_id = ref<number | null>(null)
const saving = ref(false)

async function onSave() {
  if (deck_id.value === null) return

  saving.value = true
  try {
    await insert_card.mutateAsync({
      deck_id: deck_id.value,
      anchor_id: null,
      side: null,
      front_text: front,
      back_text: back
    })
    toast.success(t('audio-reader.add-card.success'))
    emit('saved')
  } catch {
    toast.error(t('audio-reader.add-card.error'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div data-testid="add-card-form" class="mt-3 flex flex-col gap-2">
    <select
      data-testid="add-card-form__deck"
      v-model="deck_id"
      class="rounded-5 bg-brown-100 px-3 py-2 text-brown-700 dark:bg-grey-800 dark:text-brown-200"
    >
      <option :value="null" disabled>{{ t('audio-reader.add-card.deck-placeholder') }}</option>
      <option v-for="deck in decks" :key="deck.id" :value="deck.id">{{ deck.title }}</option>
    </select>

    <div data-testid="add-card-form__actions" class="flex gap-2">
      <ui-button data-theme="grey-400" size="sm" full-width @click="emit('cancel')">
        {{ t('audio-reader.add-card.cancel-button') }}
      </ui-button>
      <ui-button
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="sm"
        full-width
        :disabled="deck_id === null || saving"
        @click="onSave"
      >
        {{ t('audio-reader.add-card.save-button') }}
      </ui-button>
    </div>
  </div>
</template>
