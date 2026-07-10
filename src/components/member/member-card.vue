<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isoNow, formatShortDate } from '@/utils/date'
import { memberCoverBindings } from './cover'
import UiImage from '@/components/ui-kit/image.vue'

const { t, locale } = useI18n()

const { createdAt = isoNow(), cover } = defineProps<{
  createdAt: string
  displayName?: string
  cardComment?: string
  cardTitle: string
  cover?: DeckCover
}>()

const created_on = computed(() => formatShortDate(createdAt, locale.value))

const body_bindings = computed(() => memberCoverBindings(cover))
</script>

<template>
  <div
    data-testid="member-card"
    class="bg-brown-200 dark:bg-stone-900 rounded-8 border-brown-200 dark:border-stone-900 flex w-89 flex-col overflow-hidden border-8 shadow-[-1px_-1px_0_0_var(--color-brown-100)] dark:shadow-[-1px_-1px_0_0_var(--color-grey-900)]"
  >
    <div data-testid="member-card__header" class="flex items-center justify-center px-9 pt-4 pb-1">
      <h1 class="text-brown-700 dark:text-brown-200 text-5xl">{{ displayName }}</h1>
    </div>

    <div
      data-testid="member-card__body"
      v-bind="body_bindings"
      class="wave-top-[40px] flex h-full flex-col items-center gap-4 bg-(--theme-primary) px-8 pt-9 pb-3"
    >
      <div data-testid="member-card__avatar" class="flex h-full flex-col justify-center">
        <div
          class="bg-brown-200 dark:bg-stone-900 rounded-19 border-brown-200 dark:border-stone-900 h-50 w-50 overflow-hidden border-10"
        >
          <ui-image src="_default" class="h-full w-full" />
        </div>
      </div>

      <div
        data-testid="member-card__comment"
        class="bg-brown-200 dark:bg-stone-900 rounded-4 w-full px-2 py-3"
      >
        <p
          class="text-brown-700 dark:text-brown-100 flex h-[3lh] items-center justify-center text-center"
        >
          <q class="min-w-0 wrap-break-word">{{
            cardComment || t('member-card.description-fallback')
          }}</q>
        </p>
      </div>

      <div
        data-testid="member-card__registration"
        class="align-center flex w-full justify-between text-sm font-semibold text-brown-100 mt-2"
      >
        <p>{{ t('member-card.field.registration-label', { date: created_on }) }}</p>
        <p aria-hidden="true">&lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt;</p>
      </div>
    </div>
  </div>
</template>
