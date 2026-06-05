<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslateTermMutation, EdgeFunctionError, type TranslationResult } from '@/api/lessons'
import UiPopover from '@/components/ui-kit/popover.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import UiTag from '@/components/ui-kit/tag.vue'
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

const result = ref<TranslationResult | null>(null)
const is_loading = ref(false)
const error_key = ref<string | null>(null)
const adding = ref(false)

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

watch(
  () => [open, term] as const,
  ([is_open, current]) => {
    if (is_open && current) fetchTranslation()
  },
  { immediate: true }
)
</script>

<template>
  <ui-popover
    :open="open"
    :anchor_rect="rect"
    position="bottom"
    :gap="8"
    :padding="8"
    shadow
    class="[--popover-arrow-color:var(--color-brown-300)] dark:[--popover-arrow-color:var(--color-grey-700)]"
    @close="emit('close')"
  >
    <div data-testid="term-popover" class="w-84 rounded-7 bg-brown-300 p-8 dark:bg-grey-700">
      <header data-testid="term-popover__header" class="flex items-start justify-between gap-3">
        <span
          data-testid="term-popover__term"
          class="text-6xl leading-tight wrap-break-word text-brown-700 dark:text-brown-200"
        >
          {{ term }}
        </span>
        <ui-button
          data-theme="grey-400"
          icon-left="close"
          icon-only
          size="sm"
          @click="emit('close')"
        >
          {{ t('audio-reader.popover.close-button') }}
        </ui-button>
      </header>

      <div
        v-if="result && (result.reading || result.pos)"
        data-testid="term-popover__reading"
        class="mt-1 flex flex-wrap items-center gap-2"
      >
        <span v-if="result.reading" class="text-base text-brown-700 dark:text-grey-400">
          {{ result.reading }}
        </span>
        <ui-tag v-if="result.pos" data-theme="green-400" class="bgx-diagonal-stripes">{{
          result.pos
        }}</ui-tag>
      </div>

      <ui-divider class="my-3" label="Definition" />

      <div
        v-if="is_loading"
        data-testid="term-popover__loading"
        class="flex flex-col gap-2 [--skeleton-sheen:var(--color-brown-200)] dark:[--skeleton-sheen:var(--color-grey-400)]"
        aria-busy="true"
        :aria-label="t('audio-reader.popover.loading')"
      >
        <span class="term-popover__skeleton h-6 w-3/5 rounded-2 bg-brown-500 dark:bg-grey-500" />
        <span class="term-popover__skeleton h-4 w-full rounded-2 bg-brown-500 dark:bg-grey-500" />
        <span class="term-popover__skeleton h-4 w-4/5 rounded-2 bg-brown-500 dark:bg-grey-500" />
      </div>

      <p
        v-else-if="error_key"
        data-testid="term-popover__error"
        class="text-red-500 dark:text-red-400"
      >
        {{ t(error_key) }}
      </p>

      <template v-else-if="result">
        <div data-testid="term-popover__result" class="flex flex-col gap-1">
          <p
            data-testid="term-popover__translation"
            class="text-3xl text-brown-700 dark:text-brown-200 capitalize"
          >
            {{ result.translation }}
          </p>
          <p
            v-if="result.description"
            data-testid="term-popover__description"
            class="text-base text-brown-700 dark:text-grey-300"
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
  </ui-popover>
</template>

<style>
.term-popover__skeleton {
  position: relative;
  overflow: hidden;
}

/* A light gradient sweeps L→R across each bar; staggered so the lines cascade.
   Gated behind the reduce-animations toggle — bars sit static when it's on. */
body:not(.animation-safe) .term-popover__skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--skeleton-sheen), transparent);
  animation: term-popover-skeleton-sweep 1.4s ease-in-out infinite;
}

body:not(.animation-safe) .term-popover__skeleton:nth-child(2)::after {
  animation-delay: 0.1s;
}

body:not(.animation-safe) .term-popover__skeleton:nth-child(3)::after {
  animation-delay: 0.2s;
}

@keyframes term-popover-skeleton-sweep {
  to {
    transform: translateX(100%);
  }
}
</style>
