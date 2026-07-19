<script setup lang="ts" generic="T extends string | number">
import UiTappable from '@/components/ui-kit/tappable.vue'
import { TYPE_SFX } from '@/sfx/config'

type TabBarProps<V> = {
  tabs: { value: V; label: string }[]
  active: V
  full_width?: boolean
  size?: 'sm' | 'base'
}

const { size = 'sm', full_width = false } = defineProps<TabBarProps<T>>()

const emit = defineEmits<{
  (e: 'update:active', value: T): void
}>()
</script>

<template>
  <div
    data-testid="tab-bar"
    :class="[
      size === 'base'
        ? 'gap-1 p-1 rounded-3.5 bg-brown-200 dark:bg-stone-950'
        : 'gap-1 p-1 rounded-2.5 bg-brown-200 dark:bg-stone-950',
      full_width ? 'flex w-full' : 'inline-flex'
    ]"
  >
    <ui-tappable
      v-for="tab in tabs"
      :key="String(tab.value)"
      v-sfx="{ hover: tab.value === active ? undefined : TYPE_SFX }"
      as="button"
      type="button"
      data-testid="tab-bar__tab"
      :data-active="tab.value === active"
      bgx_color="var(--color-brown-500)"
      :class="[
        'cursor-pointer text-ink-muted data-[active=false]:hover:bg-brown-300 dark:data-[active=false]:hover:bg-stone-900 data-[active=true]:bg-(--color-accent) data-[active=true]:text-(--color-on-accent)',
        size === 'base' ? 'py-2 px-4 text-base rounded-3' : 'py-1.5 px-3.5 text-sm rounded-2',
        full_width && 'flex-1 justify-center'
      ]"
      @tap="emit('update:active', tab.value)"
    >
      {{ tab.label }}
    </ui-tappable>
  </div>
</template>
