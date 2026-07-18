<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import Card from '@/components/card/index.vue'
import { useBulkInsertCardsInDeckMutation } from '@/api/cards'
import { useNoticeStore } from '@/stores/notice-store'
import { cardEditorKey } from '@/views/deck/composables'

const { t } = useI18n()
const notice = useNoticeStore()

type CardDraft = { front_text: string; back_text: string }

const saving = ref(false)
const delimiter = ref<string>('::')
const raw_text = ref<string>('')
const cards = ref<CardDraft[]>([])
const bulk_insert_mutation = useBulkInsertCardsInDeckMutation()

const { deck_id, guardAddCards, handleLimitError } = inject(cardEditorKey)!

const has_unsaved_changes = computed(() => cards.value.length > 0)

function onImport() {
  cards.value = raw_text.value.split('\n').map((line) => {
    const [front, back] = line.split(delimiter.value)
    return {
      front_text: front.trim(),
      back_text: back.trim()
    }
  })
}

async function onSave() {
  if (!has_unsaved_changes.value || saving.value) return
  if (!(await guardAddCards(cards.value.length))) return

  saving.value = true
  try {
    await bulk_insert_mutation.mutateAsync({ deck_id, cards: cards.value })
    cards.value = []
  } catch (error) {
    if (!handleLimitError(error)) notice.error(t('deck-view.card-importer.error'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 py-4 w-full">
    <div class="w-full flex gap-4">
      <div class="w-full">
        <textarea
          class="p-6 w-full h-200 bg-white outline-1 outline-blue-500 rounded-4 resize-none text-brown-700"
          v-model="raw_text"
        />
        <ui-button data-theme="blue-500" @press="onImport">{{
          t('deck-view.card-importer.import-button')
        }}</ui-button>
      </div>

      <div class="w-full flex flex-col gap-2">
        <div class="flex flex-col gap-2 w-full h-200 overflow-auto">
          <div v-for="(card, i) in cards" :key="i" class="flex gap-2">
            <Card v-bind="card" side="front" class="w-[260px]" />
            <Card v-bind="card" side="back" class="w-[260px]" />
          </div>
        </div>
        <ui-button data-theme="blue-500" @press="onSave" :disabled="!has_unsaved_changes">{{
          saving
            ? t('deck-view.card-importer.save-button.saving')
            : t('deck-view.card-importer.save-button.idle')
        }}</ui-button>
      </div>
    </div>
  </div>
</template>
