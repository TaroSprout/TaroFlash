<script setup lang="ts">
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import AvatarImage from '@/components/member/avatar-image.vue'
import UiToggle from '@/components/ui-kit/toggle.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import { useFeedbackRow } from './use-feedback-row'

const props = defineProps<{ item: FeedbackItem }>()

const { t } = useI18n()
const { published, status, status_options, onPublishedChange, onStatusChange } = useFeedbackRow(
  toRef(props, 'item')
)
</script>

<template>
  <div
    data-testid="admin-feedback-row"
    class="bg-raised rounded-8 flex w-full items-start gap-4 p-6"
  >
    <div
      data-testid="admin-feedback-row__avatar"
      class="bg-mat rounded-full size-14 p-1 shrink-0 overflow-hidden"
    >
      <avatar-image :avatar="item.member_avatar" class="h-full w-full" />
    </div>

    <div data-testid="admin-feedback-row__content" class="flex min-w-0 flex-1 flex-col gap-2">
      <div data-testid="admin-feedback-row__heading">
        <h2 class="text-ink truncate text-2xl">{{ item.title }}</h2>
        <p
          v-if="item.member_display_name"
          data-testid="admin-feedback-row__author"
          data-palette="info"
          class="text-(--color-accent-text) truncate text-base"
          :title="item.member_display_name"
        >
          {{ item.member_display_name }}
        </p>
      </div>
      <p v-if="item.body" class="text-ink-muted text-base">{{ item.body }}</p>
      <p data-testid="admin-feedback-row__vote-count" class="text-ink-muted text-sm">
        {{ item.vote_count }}
      </p>
    </div>

    <div data-testid="admin-feedback-row__controls" class="flex w-44 shrink-0 flex-col gap-3">
      <ui-toggle
        data-testid="admin-feedback-row__published"
        :checked="published"
        @update:checked="(value) => onPublishedChange(Boolean(value))"
      >
        {{ t('admin.feedback-page.published-label') }}
      </ui-toggle>

      <ui-select-menu
        data-testid="admin-feedback-row__status"
        :options="status_options"
        :model-value="status"
        @update:model-value="onStatusChange"
      />
    </div>
  </div>
</template>
