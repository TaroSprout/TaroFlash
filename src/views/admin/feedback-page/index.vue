<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FeedbackRow from './feedback-row.vue'
import { useAdminFeedbackItemsQuery } from '@/api/feedback'

const { t } = useI18n()
const { data: items } = useAdminFeedbackItemsQuery()
</script>

<template>
  <div data-testid="admin-feedback-page" class="flex flex-col gap-5">
    <p
      v-if="items && items.length === 0"
      data-testid="admin-feedback-page__empty"
      class="text-ink-muted text-base text-center"
    >
      {{ t('admin.feedback-page.empty') }}
    </p>

    <div v-else data-testid="admin-feedback-page__list" class="flex flex-col gap-2">
      <feedback-row v-for="item in items" :key="item.id" :item="item" />
    </div>
  </div>
</template>
