<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import AvatarImage from './avatar-image.vue'

type MemberPolaroidSize = 'base' | 'sm'

type MemberPolaroidProps = {
  avatar?: string
  size?: MemberPolaroidSize
}

const SIZES: Record<MemberPolaroidSize, { frame: string; clip: string }> = {
  base: { frame: 'w-30 p-2 pb-6', clip: '-top-3 left-12 size-10' },
  sm: { frame: 'w-24 p-1.5 pb-5', clip: '-top-3 left-11 size-9' }
}

const { avatar, size = 'base' } = defineProps<MemberPolaroidProps>()
</script>

<template>
  <div data-testid="member-polaroid" :data-size="size" class="-rotate-12 select-none">
    <div
      data-testid="member-polaroid__frame"
      data-station="float"
      class="bg-surface rounded-2 shadow-xs relative"
      :class="SIZES[size].frame"
    >
      <ui-icon
        src="paperclip"
        class="text-ink-muted absolute z-10 rotate-200"
        :class="SIZES[size].clip"
      />

      <div
        data-testid="member-polaroid__photo"
        class="bg-mat rounded-1 aspect-square overflow-hidden"
      >
        <avatar-image :avatar="avatar" class="h-full w-full" />
      </div>
    </div>
  </div>
</template>
