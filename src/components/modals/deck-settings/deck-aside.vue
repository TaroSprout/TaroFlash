<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { deckEditorKey } from '@/composables/deck-editor'
import { emitSfx } from '@/sfx/bus'

type DeckAsideProps = {
  loading?: boolean
}

const { loading } = defineProps<DeckAsideProps>()

const { t } = useI18n()
const { settings, is_dirty } = inject(deckEditorKey)!

const title_error = ref<string>()

const emit = defineEmits<{ save: [] }>()

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

    <ui-button
      data-testid="deck-aside__save-button"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="lg"
      full-width
      :loading="loading"
      :disabled="!is_dirty"
      :sfx="{ click: 'ui.snappy_button_2' }"
      click-when-disabled
      @click="is_dirty ? emit('save') : emitSfx('ui.digi_powerdown')"
    >
      {{ t('deck.settings-modal.submit-edit') }}
    </ui-button>
  </aside>
</template>
