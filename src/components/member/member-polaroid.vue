<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import AvatarImage from './avatar-image.vue'

type MemberPolaroidSize = 'base' | 'sm'

// `origin` positions the frame's pivot at the clip, in percent of the frame's
// own box, so the frame swings around the clip instead of its own center.
const SIZES: Record<MemberPolaroidSize, { frame: string; clip: string; origin: string }> = {
  base: { frame: 'w-30 p-2 pb-6', clip: '-top-3 left-12 size-10', origin: '57% 6%' },
  sm: { frame: 'w-24 p-1.5 pb-5', clip: '-top-3 left-11 size-9', origin: '65% 5%' }
}

type MemberPolaroidProps = {
  avatar?: string
  size?: MemberPolaroidSize
  // Enables the hover swing toward upright — call sites that make the
  // polaroid clickable opt in; decorative call sites leave it off.
  interactive?: boolean
}

const { avatar, size = 'base', interactive = false } = defineProps<MemberPolaroidProps>()
</script>

<template>
  <div data-testid="member-polaroid" :data-size="size" class="select-none">
    <div data-testid="member-polaroid__positioner" class="relative">
      <ui-icon
        src="paperclip"
        class="text-ink-muted absolute z-10 rotate-188"
        :class="SIZES[size].clip"
      />

      <div
        data-testid="member-polaroid__frame"
        data-station="float"
        class="bg-surface rounded-2 shadow-xs -rotate-12"
        :class="[
          SIZES[size].frame,
          interactive && 'transition-transform duration-150 group-hover:-rotate-8'
        ]"
        :style="{ transformOrigin: SIZES[size].origin }"
      >
        <div
          data-testid="member-polaroid__photo"
          class="bg-mat rounded-1 aspect-square overflow-hidden"
        >
          <avatar-image :avatar="avatar" class="h-full w-full" />
        </div>
      </div>
    </div>
  </div>
</template>
