<script setup lang="ts">
import { ref, useAttrs } from 'vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiBurst, { type BurstSize } from '@/components/ui-kit/burst.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useStagedTap } from '@/composables/ui/staged-tap'

type AppWrapperProps = {
  title: string
  theme: Theme
  tapHold?: number
  tapDuration?: number
  tapBurst?: BurstSize | false
  /** Run the click handler synchronously on tap instead of waiting for the animation peak. */
  instantAction?: boolean
}
const {
  tapHold = 0.1,
  tapDuration = 0.1,
  tapBurst = false,
  instantAction = false
} = defineProps<AppWrapperProps>()
const emit = defineEmits<{ (e: 'tapStart'): void }>()
defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const is_coarse = useMatchMedia('coarse')
const burst_id = ref(0)

const { playing, tap } = useStagedTap({
  animate: 'pop',
  yoyo: true,
  duration: tapDuration,
  hold: tapHold
})

type ClickHandler = (ev: MouseEvent) => void

function onCaptureClick(e: MouseEvent) {
  const handler = resolveClickHandler()

  tap(handler, {
    captureMode: true,
    triggerAt: instantAction ? 'press' : 'peak',
    onTap: () => {
      emit('tapStart')
      spawnBurst()
    }
  })(e)
}

function resolveClickHandler(): ClickHandler | undefined {
  const raw = attrs.onClick as ClickHandler | ClickHandler[] | undefined
  if (!raw) return
  return Array.isArray(raw) ? (ev) => raw.forEach((fn) => fn(ev)) : raw
}

function spawnBurst() {
  if (!tapBurst || !is_coarse.value) return
  burst_id.value++
}
</script>

<template>
  <div data-testid="app-wrapper-container" class="flex flex-col items-center gap-0.5">
    <div class="relative">
      <ui-tooltip
        :text="title"
        position="bottom"
        :data-theme="theme"
        :gap="is_coarse ? -16 : -5"
        element="button"
        data-testid="phone-app"
        v-bind="$attrs"
        :data-playing="playing || null"
        @click.capture="onCaptureClick"
      >
        <slot></slot>
      </ui-tooltip>
      <ui-burst
        v-if="burst_id"
        :key="burst_id"
        :size="tapBurst || 'base'"
        :width="5"
        class="pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        @done="burst_id = 0"
      />
    </div>

    <span data-testid="app-wrapper__title" class="text-brown-500 dark:text-brown-100 text-sm">{{
      title
    }}</span>
  </div>
</template>
