<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import AvatarImage from '@/components/member/avatar-image.vue'
import { emitSfx } from '@/sfx/bus'
import { useToggleFeedbackVoteMutation } from '@/api/feedback'

const { item } = defineProps<{ item: FeedbackItem }>()

const { t } = useI18n()
const toggleVote = useToggleFeedbackVoteMutation()

async function onToggleVote() {
  const voted = await toggleVote.mutateAsync(item.id)
  emitSfx(voted ? 'toggle_on' : 'toggle_off')
}
</script>

<template>
  <div
    data-testid="feedback-card"
    class="bg-brown-50 dark:bg-stone-800 rounded-8 flex w-full items-start gap-4 p-6"
  >
    <div
      data-testid="feedback-card__avatar"
      class="bg-brown-200 dark:bg-stone-700 rounded-full h-12 w-12 shrink-0 overflow-hidden"
    >
      <avatar-image :avatar="item.member_avatar" class="h-full w-full" />
    </div>

    <div data-testid="feedback-card__content" class="flex min-w-0 flex-1 flex-col gap-2">
      <h2 class="text-brown-700 dark:text-brown-200 truncate text-2xl">{{ item.title }}</h2>
      <p v-if="item.body" class="text-brown-500 dark:text-brown-300 text-base">{{ item.body }}</p>
    </div>

    <ui-button
      data-testid="feedback-card__vote"
      data-theme="pink-500"
      icon-only
      icon-left="symbol-hearts"
      :active="item.voted_by_me"
      :loading="toggleVote.isLoading.value"
      play-on-tap
      @press="onToggleVote"
    >
      {{ t('feedback-board.card.vote-button') }}
    </ui-button>
  </div>
</template>
