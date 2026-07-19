<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import AvatarImage from '@/components/member/avatar-image.vue'
import { useMemberStore } from '@/stores/member'

const member_store = useMemberStore()
</script>

<template>
  <div
    data-testid="dashboard-actions-panel__polaroid"
    class="absolute top-1 -left-1 z-10 -rotate-12 select-none"
  >
    <ui-icon
      src="paperclip"
      class="absolute -top-3 left-12 z-10 size-10 rotate-200 text-ink-muted"
    />

    <div class="bg-float rounded-2 shadow-xs w-30 p-2 pb-6">
      <div
        data-testid="dashboard-actions-panel__polaroid-photo"
        class="bg-panel rounded-1 aspect-square overflow-hidden"
      >
        <avatar-image :avatar="member_store.cover.avatar" class="h-full w-full" />
      </div>
    </div>
  </div>
</template>
