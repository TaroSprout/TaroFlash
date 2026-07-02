<script setup lang="ts">
import UiIcon from './icon.vue'
import UiTappable from './tappable.vue'
import GroupedList from '@/components/layout-kit/grouped-list.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

export type NavListEntry = { value: string; icon: string; label: string }

type NavListProps = {
  entries: NavListEntry[]
}

defineProps<NavListProps>()

const emit = defineEmits<{
  navigate: [value: string]
}>()

function onNavigate(value: string) {
  emitSfx('snappy_button_5')
  emit('navigate', value)
}
</script>

<template>
  <grouped-list data-testid="nav-list">
    <ui-tappable
      v-for="entry in entries"
      :key="entry.value"
      as="button"
      type="button"
      data-testid="nav-list__card"
      :data-value="entry.value"
      class="flex items-center gap-3 p-4 text-brown-700 dark:text-brown-100 hover:bg-(--theme-neutral) hover:text-(--theme-on-neutral) cursor-pointer text-left"
      bgx_color="var(--color-brown-500)"
      v-sfx="{ hover: TYPE_SFX }"
      @tap="onNavigate(entry.value)"
    >
      <ui-icon :src="entry.icon" class="w-6 h-6" />
      <span class="flex-1">{{ entry.label }}</span>
      <ui-icon src="line-arrow-right" class="size-4" />
    </ui-tappable>
  </grouped-list>
</template>
