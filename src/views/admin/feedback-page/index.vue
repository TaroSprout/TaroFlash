<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import FeedbackRow from './feedback-row.vue'
import { useAdminFeedbackItemsQuery } from '@/api/feedback'

const { t } = useI18n()
const { data: items } = useAdminFeedbackItemsQuery()
</script>

<template>
  <div data-testid="admin-feedback-page" class="flex h-full flex-col gap-5">
    <p
      v-if="items && items.length === 0"
      data-testid="admin-feedback-page__empty"
      class="text-ink-muted text-base text-center"
    >
      {{ t('admin.feedback-page.empty') }}
    </p>

    <div v-else data-testid="admin-feedback-page__list-wrap" class="relative min-h-0 flex-1">
      <div
        data-testid="admin-feedback-page__list"
        class="scroll-hidden flex max-h-120 flex-col gap-2 overflow-y-auto"
      >
        <feedback-row v-for="item in items" :key="item.id" :item="item" />
      </div>

      <scroll-bar
        target="[data-testid='admin-feedback-page__list']"
        min-width="sm"
        class="absolute top-0 bottom-0 -right-10"
      />
    </div>
  </div>
</template>
