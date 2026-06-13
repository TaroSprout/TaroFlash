<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { flipEnter, flipLeave } from '@/utils/animations/flip'

type DropdownCaretProps = {
  open: boolean
  icon?: string
  // Re-bases just the caret to its own palette; see `surface` below.
  triggerTheme?: Theme
  triggerThemeDark?: Theme
}

const {
  open,
  icon = 'arrow-drop-down',
  triggerTheme,
  triggerThemeDark
} = defineProps<DropdownCaretProps>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

// The caret normally contrasts against the main button via theme-secondary. A
// `triggerTheme` re-bases the caret to its own palette, so it reads as that
// palette's primary surface instead (matching how the menu maps its theme).
const surface = computed(() =>
  triggerTheme
    ? 'bg-(--theme-primary) text-(--theme-on-primary)'
    : 'bg-(--theme-secondary) text-(--theme-on-secondary)'
)

function onEnter(el: Element, done: () => void) {
  flipEnter(el, 'x', done)
}

function onLeave(el: Element, done: () => void) {
  flipLeave(el, 'x', done)
}
</script>

<template>
  <div
    :data-theme="triggerTheme"
    :data-theme-dark="triggerThemeDark"
    class="flex h-full p-2 pointer-coarse:p-0"
    data-testid="dropdown-button__trigger-wrap"
  >
    <transition mode="out-in" @enter="onEnter" @leave="onLeave">
      <span
        :key="String(open)"
        role="button"
        tabindex="0"
        aria-haspopup="menu"
        :aria-expanded="open"
        :data-active="open"
        class="relative z-1 flex aspect-square h-full cursor-pointer items-center justify-center rounded-[calc(var(--btn-border-radius)-8px)] pointer-coarse:rounded-(--btn-border-radius) transition-[scale] duration-120 ease-[ease] hover:scale-110"
        :class="surface"
        data-testid="dropdown-button__trigger"
        v-sfx.hover="'ui.click_04'"
        @click.stop="emit('toggle')"
        @keydown.enter.space.stop.prevent="emit('toggle')"
      >
        <ui-icon
          :src="icon"
          class="size-[calc(var(--icon-size,20px)-6px)]"
          :class="{ 'rotate-180': open }"
        />
      </span>
    </transition>
  </div>
</template>
