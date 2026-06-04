<script setup lang="ts">
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useFloating, autoUpdate, offset, flip, shift, type VirtualElement } from '@floating-ui/vue'
import { useI18n } from 'vue-i18n'
import { useTranslateTermMutation, EdgeFunctionError, type TranslationResult } from '@/api/lessons'
import UiButton from '@/components/ui-kit/button.vue'
import AddCardForm from './add-card-form.vue'

const { open, rect, term, sentence, target_lang } = defineProps<{
  open: boolean
  rect: DOMRect | null
  term: string
  sentence: string
  target_lang: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const translate = useTranslateTermMutation()

const floating = useTemplateRef<HTMLElement>('floating')
const result = ref<TranslationResult | null>(null)
const is_loading = ref(false)
const error_key = ref<string | null>(null)
const adding = ref(false)

// floating-ui virtual element: positions the panel against the selection rect
// rather than a DOM trigger (which is what a text-selection popover needs).
const reference = computed<VirtualElement>(() => ({
  getBoundingClientRect: () => rect ?? new DOMRect()
}))

const { floatingStyles } = useFloating(reference, floating, {
  placement: 'bottom',
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
  middleware: [offset(8), flip(), shift({ padding: 8 })]
})

watch(
  () => [open, term] as const,
  ([is_open, current]) => {
    if (is_open && current) fetchTranslation()
  },
  { immediate: true }
)

watch(
  () => open,
  (is_open) => {
    if (is_open) document.addEventListener('mousedown', onOutsideClick, true)
    else document.removeEventListener('mousedown', onOutsideClick, true)
  }
)

onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick, true))

async function fetchTranslation() {
  result.value = null
  error_key.value = null
  adding.value = false
  is_loading.value = true
  try {
    result.value = await translate.mutateAsync({ term, sentence, target_lang })
  } catch (error) {
    error_key.value =
      error instanceof EdgeFunctionError && error.code === 'output_truncated'
        ? 'audio-reader.popover.too-long-error'
        : 'audio-reader.popover.error'
  } finally {
    is_loading.value = false
  }
}

function onOutsideClick(event: MouseEvent) {
  if (floating.value && !floating.value.contains(event.target as Node)) emit('close')
}
</script>

<template>
  <div
    v-if="open"
    ref="floating"
    data-testid="term-popover"
    :style="floatingStyles"
    class="z-60 w-72 rounded-7 bg-brown-300 p-4 drop-shadow-sm dark:bg-grey-700"
  >
    <header data-testid="term-popover__header" class="flex items-start justify-between gap-2">
      <span class="text-xl text-brown-700 dark:text-brown-200">{{ term }}</span>
      <ui-button data-theme="grey-400" icon-left="close" icon-only size="sm" @click="emit('close')">
        {{ t('audio-reader.popover.close-button') }}
      </ui-button>
    </header>

    <p
      v-if="is_loading"
      data-testid="term-popover__loading"
      class="mt-2 text-brown-500 dark:text-grey-400"
    >
      {{ t('audio-reader.popover.loading') }}
    </p>

    <p
      v-else-if="error_key"
      data-testid="term-popover__error"
      class="mt-2 text-red-500 dark:text-red-400"
    >
      {{ t(error_key) }}
    </p>

    <template v-else-if="result">
      <div data-testid="term-popover__result" class="mt-2 flex flex-col gap-1">
        <p
          data-testid="term-popover__translation"
          class="text-lg text-brown-700 dark:text-brown-200"
        >
          {{ result.translation }}
        </p>
        <p
          v-if="result.reading || result.pos"
          data-testid="term-popover__reading"
          class="text-sm text-brown-500 dark:text-grey-400"
        >
          {{ [result.reading, result.pos].filter(Boolean).join(' · ') }}
        </p>
        <p
          v-if="result.description"
          data-testid="term-popover__description"
          class="text-sm text-brown-600 dark:text-grey-300"
        >
          {{ result.description }}
        </p>
      </div>

      <add-card-form
        v-if="adding"
        :front="term"
        :back="result.translation"
        @saved="emit('close')"
        @cancel="adding = false"
      />
      <ui-button
        v-else
        data-testid="term-popover__add"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="add"
        size="sm"
        full-width
        class="mt-3"
        @click="adding = true"
      >
        {{ t('audio-reader.popover.add-card-button') }}
      </ui-button>
    </template>
  </div>
</template>
