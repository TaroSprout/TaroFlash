<script setup lang="ts">
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import MemberPolaroid from '@/components/member/member-polaroid.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
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
    data-station="panel"
    class="bg-surface rounded-8 relative flex w-full items-start gap-4 p-6"
  >
    <member-polaroid :avatar="item.member_avatar" size="sm" class="absolute top-2 left-0 z-10" />

    <div data-testid="admin-feedback-row__content" class="flex min-w-0 flex-1 flex-col gap-2 pl-24">
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

      <div
        data-testid="admin-feedback-row__meta"
        class="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1"
      >
        <ui-select-menu
          data-testid="admin-feedback-row__status"
          size="sm"
          :options="status_options"
          :model-value="status"
          @update:model-value="onStatusChange"
        />

        <ui-toggle
          data-testid="admin-feedback-row__published"
          class="shrink-0 gap-3"
          :checked="published"
          @update:checked="(value) => onPublishedChange(Boolean(value))"
        >
          {{ t('admin.feedback-page.published-label') }}
        </ui-toggle>
      </div>
    </div>

    <div data-testid="admin-feedback-row__vote-count" data-palette="pink" class="relative shrink-0">
      <ui-icon src="symbol-hearts" class="text-(--color-accent-text) size-6" />

      <span
        data-testid="admin-feedback-row__vote-count-value"
        class="text-ink-muted absolute top-full left-1/2 -translate-x-1/2 text-base"
      >
        {{ item.vote_count }}
      </span>
    </div>
  </div>
</template>
