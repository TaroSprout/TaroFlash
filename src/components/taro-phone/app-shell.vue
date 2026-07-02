<script setup lang="ts">
import { ref } from 'vue'
import UiBurst from '@/components/ui-kit/burst.vue'
import UiImage from '@/components/ui-kit/image.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useStagedTap } from '@/composables/ui/staged-tap'

type AppShellProps = {
  title: string
  iconSrc?: string
  hoverIconSrc?: string
  tapHold?: number
  tapDuration?: number
  instantAction?: boolean
}
const {
  title,
  iconSrc,
  hoverIconSrc,
  tapHold = 0.1,
  tapDuration = 0.1,
  instantAction = false
} = defineProps<AppShellProps>()

const emit = defineEmits<{ press: [e: MouseEvent] }>()
defineOptions({ inheritAttrs: false })

const is_coarse = useMatchMedia('coarse')
const burst_id = ref(0)

const { playing, tap } = useStagedTap({
  animate: 'pop',
  yoyo: true,
  duration: tapDuration,
  hold: tapHold
})

function onClick(e: MouseEvent) {
  tap((ev) => emit('press', ev), {
    triggerAt: instantAction ? 'press' : 'peak',
    onTap: spawnBurst
  })(e)
}

function spawnBurst() {
  if (!is_coarse.value) return
  burst_id.value++
}
</script>

<template>
  <div data-testid="app-shell-container" class="flex flex-col items-center gap-0.5">
    <div>
      <button
        data-testid="phone-app"
        v-bind="$attrs"
        :data-active="playing || null"
        class="rounded-6 pointer-fine:rounded-6 size-16.5 cursor-pointer hover:scale-110 focus:scale-110 transition-transform duration-50 flex items-center justify-center text-white group outline-none bg-(--theme-primary) tap:bgx-diagonal-stripes animation-safe:tap:bgx-slide p-0.5"
        @click="onClick"
      >
        <slot>
          <ui-image
            v-if="iconSrc"
            :src="iconSrc"
            class="pointer-events-none"
            :class="{
              'group-hover:hidden group-focus:hidden group-data-[active=true]:hidden': hoverIconSrc
            }"
          />
          <ui-image
            v-if="hoverIconSrc"
            :src="hoverIconSrc"
            class="hidden group-hover:block group-focus:block group-data-[active=true]:block pointer-events-none"
          />
        </slot>
      </button>
      <ui-burst
        v-if="burst_id"
        :key="burst_id"
        size="base"
        :width="5"
        class="pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        @done="burst_id = 0"
      />
    </div>

    <span data-testid="app-shell__title" class="text-brown-500 dark:text-brown-100 text-sm">{{
      title
    }}</span>
  </div>
</template>
