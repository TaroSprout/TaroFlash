<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'

type UiPinnedCardProps = {
  tucked?: boolean
  // Opt-in: swings the card toward upright on hover, pivoting at the clip.
  // Off by default so member settings and the splash preview stay static.
  hover_lift?: boolean
}

const { tucked = false, hover_lift = false } = defineProps<UiPinnedCardProps>()

defineSlots<{
  backdrop(): any
  default(): any
}>()
</script>

<template>
  <div
    data-testid="ui-pinned-card"
    class="relative"
    :class="hover_lift && 'group/pinned-card'"
    v-sfx="hover_lift ? { hover: 'ui.hover' } : undefined"
  >
    <slot name="backdrop"></slot>

    <div
      data-testid="ui-pinned-card__paperclip"
      :data-tucked="tucked"
      class="absolute -top-8 right-15 -translate-x-1/2 z-10 drop-shadow-2xs transition-opacity duration-100"
      :class="tucked && 'opacity-0'"
    >
      <ui-icon src="paperclip" class="w-16 h-16 -rotate-186 text-raised-shade" />
    </div>

    <div data-testid="ui-pinned-card__card" class="rotate-4 drop-shadow-sm">
      <div
        data-testid="ui-pinned-card__swing"
        :class="
          hover_lift &&
          'origin-[calc(100%_-_124px)_0px] transition-transform duration-150 ease-out group-hover/pinned-card:-rotate-2'
        "
      >
        <slot></slot>
      </div>
    </div>
  </div>
</template>
