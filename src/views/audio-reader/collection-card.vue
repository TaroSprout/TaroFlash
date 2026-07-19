<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { provideDepth } from '@/composables/ui/depth'
import { formatShortDate } from '@/utils/date'

const { collection } = defineProps<{ collection: LessonCollectionWithCount }>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'edit'): void
}>()

const { t } = useI18n()

// Fixed brown-200/grey-700 panel surface; declare depth 1 so its neutral edit
// button resolves to the raised `element` pop (mirrors lesson-card).
provideDepth(1)
</script>

<template>
  <div
    data-testid="collection-card"
    data-depth="1"
    class="group relative flex w-56 flex-col gap-3 rounded-7 bg-brown-200 p-4 text-left dark:bg-grey-700"
  >
    <button
      data-testid="collection-card__open"
      type="button"
      class="flex cursor-pointer flex-col gap-3"
      @click="emit('open')"
    >
      <span
        data-testid="collection-card__icon"
        class="flex size-10 items-center justify-center rounded-full bg-blue-500 text-white dark:bg-blue-650"
      >
        <ui-icon src="card-deck" class="h-5" />
      </span>

      <span data-testid="collection-card__title" class="line-clamp-2 text-xl text-ink">
        {{ collection.title }}
      </span>

      <span data-testid="collection-card__count" class="text-base text-ink">
        {{ t('lesson-collections.card.count', { count: collection.lesson_count }) }}
      </span>

      <span data-testid="collection-card__date" class="text-sm text-ink-muted">
        {{ formatShortDate(collection.created_at ?? '') }}
      </span>
    </button>

    <ui-button
      neutral
      data-testid="collection-card__edit"
      icon-left="settings"
      icon-only
      size="sm"
      class="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
      @press="emit('edit')"
    >
      {{ t('lesson-collections.card.edit-button') }}
    </ui-button>
  </div>
</template>
