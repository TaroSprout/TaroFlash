<script setup lang="ts">
import UiIcon from '../icon.vue'
import UiTappable from '../tappable.vue'
import { TYPE_SFX } from '@/sfx/config'
import type { SfxOptions } from '@/sfx/directive'
import type { OptionsPanelEntry } from './index.vue'

type OptionsPanelRowProps = {
  entry: OptionsPanelEntry
  size: 'base' | 'lg'
  sfx?: SfxOptions
  interactive: boolean
}

const { entry, size, sfx = {}, interactive } = defineProps<OptionsPanelRowProps>()

defineSlots<{
  leading?(props: { entry: OptionsPanelEntry }): any
  trailing?(props: { entry: OptionsPanelEntry }): any
}>()

const emit = defineEmits<{
  select: []
}>()

function onSelect() {
  if (entry.disabled) return
  emit('select')
}
</script>

<template>
  <component
    :is="interactive ? UiTappable : 'div'"
    v-bind="
      interactive
        ? {
            as: 'button',
            type: 'button',
            active_on_hover: true,
            sfx: { hover: TYPE_SFX, ...sfx }
          }
        : {}
    "
    data-testid="options-panel__card"
    :data-value="entry.value"
    class="text-(--theme-on-primary) text-left flex items-center gap-3 py-4 px-6 first:pt-6 first:pb-3 last:pb-6 last:pt-3"
    :class="[
      interactive ? 'cursor-pointer' : '',
      entry.disabled ? 'pointer-events-none opacity-20' : ''
    ]"
    :bgx_color="interactive ? 'var(--theme-neutral)' : undefined"
    @tap="onSelect"
  >
    <slot name="leading" :entry="entry">
      <ui-icon v-if="entry.icon" :src="entry.icon" :class="size === 'lg' ? 'size-7' : 'size-6'" />
    </slot>

    <span class="flex-1" :class="size === 'lg' ? 'text-lg' : 'text-base'">{{ entry.label }}</span>

    <slot name="trailing" :entry="entry">
      <ui-icon
        v-if="interactive"
        :src="entry.trailingIcon ?? 'line-arrow-right'"
        :class="size === 'lg' ? 'size-5' : 'size-4'"
      />
    </slot>
  </component>
</template>
