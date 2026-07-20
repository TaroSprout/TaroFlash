<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiBurst from '@/components/ui-kit/burst.vue'
import AvatarImage from '@/components/member/avatar-image.vue'
import { emitSfx } from '@/sfx/bus'
import { useNoticeStore } from '@/stores/notice-store'
import { useToggleFeedbackVoteMutation } from '@/api/feedback'
import { TYPE_SFX } from '@/sfx/config'

const { item } = defineProps<{ item: FeedbackItem }>()

const { t } = useI18n()
const notice = useNoticeStore()
const toggleVote = useToggleFeedbackVoteMutation()

const burst_id = ref(0)

async function onToggleVote() {
  const was_voted = item.voted_by_me

  try {
    emitSfx(was_voted ? 'toggle_off' : 'generic_notification_9')
    if (!was_voted) burst_id.value++
    await toggleVote.mutateAsync(item.id)
  } catch {
    notice.error(t('toast.error.feedback-vote-failed'))
  }
}
</script>

<template>
  <div data-testid="feedback-card" class="bg-float rounded-8 flex w-full items-start gap-4 p-6">
    <div
      data-testid="feedback-card__avatar"
      class="bg-element rounded-full size-14 p-1 shrink-0 overflow-hidden"
    >
      <avatar-image :avatar="item.member_avatar" class="h-full w-full" />
    </div>

    <div data-testid="feedback-card__content" class="flex min-w-0 flex-1 flex-col gap-2">
      <div data-testid="feedback-card__heading">
        <h2 class="text-ink truncate text-2xl">{{ item.title }}</h2>
        <p
          v-if="item.member_display_name"
          data-palette="info"
          class="text-(--color-accent) truncate text-base"
        >
          {{ item.member_display_name }}
        </p>
      </div>
      <p v-if="item.body" class="text-ink-muted text-base">{{ item.body }}</p>
    </div>

    <div data-testid="feedback-card__vote-wrap" class="relative shrink-0">
      <button
        data-testid="feedback-card__vote"
        type="button"
        :aria-label="t('feedback-board.card.vote-button')"
        :disabled="toggleVote.isLoading.value"
        data-palette="pink"
        class="flex cursor-pointer items-center justify-center duration-100 disabled:opacity-50 hover:scale-110 hover:rotate-5"
        :class="item.voted_by_me ? 'text-(--color-accent)' : 'text-ink-muted'"
        v-sfx="{ hover: TYPE_SFX }"
        @click="onToggleVote"
      >
        <ui-icon src="symbol-hearts" class="size-6" />
      </button>

      <ui-burst
        v-if="burst_id"
        :key="burst_id"
        data-palette="pink"
        size="sm"
        :width="4"
        class="pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        @done="burst_id = 0"
      />
    </div>
  </div>
</template>
