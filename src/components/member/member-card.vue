<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isoNow, formatShortDate } from '@/utils/date'
import { coverBindings } from '@/utils/cover'
import { withMemberCardCoverDefaults } from '@/utils/member/defaults'
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

const body_bindings = computed(() =>
  coverBindings(withMemberCardCoverDefaults(cover), { border: false })
)
</script>

<template>
  <div
    data-testid="member-card"
    class="bg-brown-300 dark:bg-stone-900 rounded-8 border-brown-300 dark:border-stone-900 flex w-89 flex-col overflow-hidden border-8"
  >
    <div data-testid="member-card__header" class="flex items-center justify-center px-9 pt-6 pb-2">
      <h1 class="text-brown-700 dark:text-brown-100 text-5xl">{{ t('member-card.heading') }}</h1>
    </div>

    <div
      data-testid="member-card__body"
      v-bind="body_bindings"
      class="wave-top-[40px] flex h-full flex-col items-center gap-4.5 bg-(--theme-primary) px-8 pt-9 pb-3"
    >
      <div data-testid="member-card__avatar" class="flex h-full flex-col justify-center">
        <div
          class="bg-brown-300 dark:bg-stone-900 rounded-19 border-brown-300 dark:border-stone-900 h-50 w-50 overflow-hidden border-10"
        >
          <ui-image src="_default" class="h-full w-full" />
        </div>
      </div>

      <div
        data-testid="member-card__comment"
        class="bg-brown-300 dark:bg-stone-900 text-brown-700 dark:text-brown-100 ring-brown-300 dark:ring-stone-900 rounded-2 w-full ring-8"
      >
        {{ cardComment || t('member-card.description-fallback') }}
      </div>

      <div data-testid="member-card__fields" class="flex w-full flex-col gap-2">
        <div data-testid="member-card__name-field" class="flex flex-col">
          <p class="pb-1 text-xl text-brown-700 dark:text-brown-100">
            {{ displayName || t('member-card.field.name-placeholder') }}
          </p>
          <div class="bg-brown-300 dark:bg-stone-900 h-px w-full"></div>
          <p class="text-sm text-brown-100 dark:text-grey-900">
            {{ t('member-card.field.member-label') }}
          </p>
        </div>
        <div data-testid="member-card__title-field" class="flex flex-col">
          <p class="pb-1 text-xl text-brown-700 dark:text-brown-100">
            {{ cardTitle || t('member-card.field.title-placeholder') }}
          </p>
          <div class="bg-brown-300 dark:bg-stone-900 h-px w-full"></div>
          <p class="text-sm text-brown-100 dark:text-grey-900">
            {{ t('member-card.field.title-label') }}
          </p>
        </div>
      </div>

      <div
        data-testid="member-card__registration"
        class="align-center flex w-full justify-between text-sm font-semibold text-brown-700 dark:text-brown-100"
      >
        <p>{{ t('member-card.field.registration-label', { date: created_on }) }}</p>
        <p aria-hidden="true">&lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt; &lt;</p>
      </div>
    </div>
  </div>
</template>
