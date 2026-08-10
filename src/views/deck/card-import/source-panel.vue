<script setup lang="ts">
import DropZone from './drop-zone.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/ui/media-query'
import { cardImportKey, type CardImportSource } from '@/views/deck/composables/card-import'

const { t } = useI18n()

const draft = inject(cardImportKey)!

// A "below" atom can't be combined with `&`, so the two halves are matched apart
// and joined here. →[K:media-query-and-cant-negate]
const is_coarse = useMatchMedia('coarse')
const is_narrow = useMatchMedia('w<md')

// On a phone the panel sits in the bottom bar, which the keyboard closes the
// moment a field in it takes focus — so typing can't be offered there.
const no_typing = computed(() => is_coarse.value && is_narrow.value)

const source_options = computed<{ value: CardImportSource; label: string; disabled?: boolean }[]>(
  () => [
    { value: 'file', label: t('deck-view.card-import.source.file') },
    { value: 'text', label: t('deck-view.card-import.source.text'), disabled: no_typing.value }
  ]
)

const show_text = computed(() => !no_typing.value && draft.source.value === 'text')

const pasted_text = computed({
  get: () => draft.pasted_text.value,
  set: (value: string) => draft.loadText(value)
})
</script>

<template>
  <div data-testid="card-import-source" class="flex w-full flex-col gap-3">
    <ui-option-group
      data-testid="card-import-source__choice"
      full_width
      :options="source_options"
      :value="draft.source.value"
      @update:value="draft.setSource"
    />

    <drop-zone
      v-if="!show_text && !draft.file_name.value"
      :error="draft.refusal_message.value"
      @file="draft.loadFile"
      @dismiss-error="draft.dismissRefusal"
    />

    <div
      v-else-if="!show_text"
      data-testid="card-import-source__file-chip"
      class="flex w-full items-center gap-2 rounded-4 bg-below px-3 py-2"
    >
      <span class="min-w-0 flex-1 truncate text-base text-ink">{{ draft.file_name.value }}</span>

      <ui-button
        neutral
        data-testid="card-import-source__clear-file"
        icon-only
        icon-left="close"
        size="sm"
        :sfx="{ press: 'digi_powerdown' }"
        @press="draft.clear"
      >
        {{ t('deck-view.card-import.clear-file') }}
      </ui-button>
    </div>

    <ui-textarea
      v-else
      data-testid="card-import-source__text"
      rows="5"
      :error="draft.refusal_message.value ?? undefined"
      :placeholder="t('deck-view.card-import.text-placeholder')"
      v-model:value="pasted_text"
    />

    <ui-button
      v-if="draft.skipped.value.length > 0"
      neutral
      variant="ghost"
      data-testid="card-import-source__skipped-notice"
      icon-left="info-circle"
      size="sm"
      @press="draft.openSkippedLines"
    >
      {{ t('deck-view.card-import.skipped-notice', { count: draft.skipped.value.length }) }}
    </ui-button>
  </div>
</template>
