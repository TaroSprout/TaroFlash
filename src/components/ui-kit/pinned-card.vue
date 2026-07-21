<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'

type UiPinnedCardProps = {
  tucked?: boolean
}

const { tucked = false } = defineProps<UiPinnedCardProps>()

defineSlots<{
  backdrop(): any
  default(): any
}>()
</script>

<template>
  <div data-testid="ui-pinned-card" class="relative">
    <slot name="backdrop"></slot>

    <div
      data-testid="ui-pinned-card__paperclip"
      :data-tucked="tucked"
      class="absolute -top-8 right-15 -translate-x-1/2 z-10 drop-shadow-2xs transition-opacity duration-100"
      :class="tucked && 'opacity-0'"
    >
      <ui-icon src="paperclip" class="w-16 h-16 -rotate-186 text-brown-300" />
    </div>

    <div data-testid="ui-pinned-card__card" class="rotate-4 drop-shadow-sm">
      <slot></slot>
    </div>
  </div>
</template>
