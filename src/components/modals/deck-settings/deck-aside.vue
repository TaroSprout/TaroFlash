<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import { deckEditorKey } from '@/composables/deck-editor'

type DeckAsideProps = {
  deck?: Deck
}

const { deck } = defineProps<DeckAsideProps>()

const { t, locale } = useI18n()
const { settings } = inject(deckEditorKey)!

const title_error = ref<string>()

const owner = computed(
  () => deck?.member_display_name || t('deck.settings-modal.aside.owner-fallback')
)

const created_at = computed(() => {
  if (!deck?.created_at) return t('deck.settings-modal.aside.date-fallback')
  const d = new Date(deck.created_at)
  if (Number.isNaN(d.getTime())) return t('deck.settings-modal.aside.date-fallback')
  return new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(d)
})

/** Returns true if valid; sets error state and returns false otherwise. */
function validate(): boolean {
  if (settings.title?.trim()) return true
  title_error.value = t('deck.create-modal.title-required')
  return false
}

defineExpose({ validate })

watch(
  () => settings.title,
  () => {
    title_error.value = undefined
  }
)
</script>

<template>
  <aside
    data-testid="deck-aside"
    class="h-full flex flex-col justify-between gap-5 text-brown-700 dark:text-brown-100"
  >
    <div data-testid="deck-aside__inputs" class="flex flex-col gap-2">
      <ui-input
        :placeholder="t('deck.title-placeholder')"
        :error="title_error"
        text-align="center"
        size="lg"
        v-model:value="settings.title"
      />
      <ui-textarea
        :placeholder="t('deck.description-placeholder')"
        :max_chars="100"
        rows="3"
        v-model:value="settings.description"
      />
    </div>

    <div
      data-testid="deck-aside__meta"
      class="flex items-center justify-center gap-2 text-sm text-brown-500 dark:text-brown-300"
    >
      <span data-testid="deck-aside__owner">{{ owner }}</span>
      <span aria-hidden="true">·</span>
      <span data-testid="deck-aside__created-at">{{ created_at }}</span>
    </div>
  </aside>
</template>
