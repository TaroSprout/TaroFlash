<script setup lang="ts">
import UiIcon from './icon.vue'
import UiTappable from './tappable.vue'
import GroupedList, { GROUPED_LIST_ITEM_CLASS } from '@/components/layout-kit/grouped-list.vue'
import { TYPE_SFX } from '@/sfx/config'
import type { SfxOptions } from '@/sfx/directive'

export type NavListEntry = {
  value: string
  label: string
  icon?: string
  // replaces the trailing chevron; falls back to 'line-arrow-right'
  trailingIcon?: string
}

type NavListProps = {
  entries: NavListEntry[]
  size?: 'base' | 'lg'
  // press sound is entirely the call site's call — pass `{ press: 'xxx' }`
  sfx?: SfxOptions
}

const { size = 'base', sfx = {} } = defineProps<NavListProps>()

const emit = defineEmits<{
  navigate: [value: string]
}>()

function onNavigate(value: string) {
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
      :class="GROUPED_LIST_ITEM_CLASS"
      class="text-(--theme-on-primary) cursor-pointer text-left"
      bgx_color="var(--theme-neutral)"
      active_on_hover
      :sfx="{ hover: TYPE_SFX, ...sfx }"
      @tap="onNavigate(entry.value)"
    >
      <ui-icon v-if="entry.icon" :src="entry.icon" :class="size === 'lg' ? 'size-7' : 'size-6'" />
      <span class="flex-1" :class="size === 'lg' ? 'text-lg' : 'text-base'">{{ entry.label }}</span>
      <ui-icon
        :src="entry.trailingIcon ?? 'line-arrow-right'"
        :class="size === 'lg' ? 'size-5' : 'size-4'"
      />
    </ui-tappable>
  </grouped-list>
</template>
