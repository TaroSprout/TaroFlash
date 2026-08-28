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
      <!-- The swing is a nested rotation so the clip pivot can be set at rest as well as on
           hover: transform-origin isn't animatable, so an origin that only appears on hover
           relocates the card in one frame before the rotation starts. The outer rotate-4 keeps
           its own default origin, so the tuned resting position is untouched. -->
      <div
        data-testid="ui-pinned-card__swing"
        :class="
          hover_lift &&
          'origin-[88%_0%] transition-transform duration-200 ease-out group-hover/pinned-card:-rotate-2'
        "
      >
        <slot></slot>
      </div>
    </div>
  </div>
</template>
