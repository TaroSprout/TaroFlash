<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { formatShortDate } from '@/utils/date'

type CollectionHeroProps = {
  collection: LessonCollection
  lessonCount: number
}

const { collection, lessonCount } = defineProps<CollectionHeroProps>()

const emit = defineEmits<{
  (e: 'upload'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="collection-hero"
    class="flex max-w-full flex-col items-center gap-6 md:flex-row md:items-end xl:w-max xl:flex-col xl:items-start"
  >
    <div
      data-testid="collection-hero__thumbnail"
      class="flex aspect-3/4 w-56 items-center justify-center rounded-7 bg-blue-500 dark:bg-blue-650"
    >
      <ui-icon src="card-deck" class="h-20 text-white" />
    </div>

    <div
      data-testid="collection-hero__details"
      class="flex flex-col items-center gap-2 md:items-start"
    >
      <h1 class="text-3xl text-center text-brown-700 md:text-left dark:text-brown-300">
        {{ collection.title }}
      </h1>

      <div class="flex items-center gap-2 text-blue-500">
        <ui-icon src="music-note" class="h-5 w-5" />
        <h2>{{ t('collection-view.count', { count: lessonCount }) }}</h2>
      </div>

      <span data-testid="collection-hero__date" class="text-base text-brown-500 dark:text-grey-400">
        {{ formatShortDate(collection.created_at ?? '') }}
      </span>
    </div>

    <div data-testid="collection-hero__actions" class="flex w-full flex-col gap-2">
      <ui-button
        data-testid="collection-view__new"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="add"
        full-width
        size="xl"
        @click="emit('upload')"
      >
        {{ t('collection-view.new-button') }}
      </ui-button>
    </div>
  </div>
</template>
