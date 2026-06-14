<script setup lang="ts" generic="T extends string | number">
import { ref } from 'vue'
import { usePlayOnTap } from '@/composables/use-play-on-tap'

type TabBarProps<V> = {
  tabs: { value: V; label: string }[]
  active: V
  hover_sfx?: string
  full_width?: boolean
  size?: 'sm' | 'base'
}

const { size = 'sm', full_width = false } = defineProps<TabBarProps<T>>()

const emit = defineEmits<{
  (e: 'update:active', value: T): void
}>()

const { interceptClick } = usePlayOnTap({ animate: false })
const playing_tab = ref<T | null>(null)

function onTabClickCapture(e: MouseEvent, value: T) {
  interceptClick(e, {
    beforePlay: () => {
      playing_tab.value = value
    },
    onAfter: () => {
      emit('update:active', value)
      playing_tab.value = null
    }
  })
}
</script>

<template>
  <div
    data-testid="tab-bar"
    :class="[
      size === 'base'
        ? 'gap-1 p-1 rounded-3.5 bg-brown-200 dark:bg-grey-900'
        : 'gap-1 p-1 rounded-2.5 bg-brown-200 dark:bg-grey-900',
      full_width ? 'flex w-full' : 'inline-flex'
    ]"
  >
    <button
      v-for="tab in tabs"
      :key="String(tab.value)"
      v-sfx="{ hover: tab.value === active ? undefined : hover_sfx }"
      type="button"
      data-testid="tab-bar__tab"
      :data-active="tab.value === active"
      :data-playing="playing_tab === tab.value || null"
      :class="[
        'relative group/tab-btn cursor-pointer text-brown-500 dark:text-brown-300 data-[active=false]:hover:bg-brown-300 dark:data-[active=false]:hover:bg-grey-800 data-[active=true]:bg-(--theme-primary) data-[active=true]:text-(--theme-on-primary)',
        size === 'base' ? 'py-2 px-4 text-base rounded-3' : 'py-1.5 px-3.5 text-sm rounded-2',
        full_width && 'flex-1 justify-center'
      ]"
      @click.capture="onTabClickCapture($event, tab.value)"
      @click="emit('update:active', tab.value)"
    >
      {{ tab.label }}
      <div
        class="absolute inset-0 rounded-[inherit] bgx-diagonal-stripes bgx-color-[var(--color-brown-300)] animation-safe:bgx-slide pointer-events-none hidden group-data-[playing=true]/tab-btn:block"
      />
    </button>
  </div>
</template>
