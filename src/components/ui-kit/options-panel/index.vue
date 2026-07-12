<script setup lang="ts">
import { useAttrs } from 'vue'
import OptionsPanelRow from './row.vue'
import type { SfxOptions } from '@/sfx/directive'

export type OptionsPanelEntry = {
  value: string
  label: string
  icon?: string
  // replaces the trailing chevron; falls back to 'line-arrow-right' when interactive
  trailingIcon?: string
  disabled?: boolean
}

type OptionsPanelProps = {
  entries: OptionsPanelEntry[]
  size?: 'base' | 'lg'
  // press sound is entirely the call site's call — pass `{ press: 'xxx' }`
  sfx?: SfxOptions
  // false renders plain rows with no tap/hover/sfx behavior (static info/status rows)
  interactive?: boolean
  // scrolls internally within the card instead of clipping; pair with a sibling
  // <scroll-bar> targeting the `__content` testid below (native scrollbar is suppressed)
  scrollable?: boolean
}

const {
  size = 'base',
  sfx = {},
  interactive = true,
  scrollable = false
} = defineProps<OptionsPanelProps>()

defineSlots<{
  leading?(props: { entry: OptionsPanelEntry }): any
  trailing?(props: { entry: OptionsPanelEntry }): any
  /** Absolutely positioned over the panel; content must opt in with pointer-events-auto. */
  overlay?(): any
}>()

const emit = defineEmits<{
  select: [value: string]
}>()

const attrs = useAttrs()

function onSelect(entry: OptionsPanelEntry) {
  emit('select', entry.value)
}
</script>

<template>
  <div
    data-testid="options-panel"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    class="relative flex flex-col"
  >
    <div
      :data-testid="
        attrs['data-testid'] ? `${attrs['data-testid']}__content` : 'options-panel__content'
      "
      class="flex min-h-0 flex-1 flex-col rounded-4 bg-(--theme-primary)"
      :class="scrollable ? 'overflow-y-auto scroll-hidden' : 'overflow-hidden'"
    >
      <options-panel-row
        v-for="entry in entries"
        :key="entry.value"
        :entry="entry"
        :size="size"
        :sfx="sfx"
        :interactive="interactive"
        @select="onSelect(entry)"
      >
        <template v-if="$slots.leading" #leading="slot_props">
          <slot name="leading" v-bind="slot_props" />
        </template>
        <template v-if="$slots.trailing" #trailing="slot_props">
          <slot name="trailing" v-bind="slot_props" />
        </template>
      </options-panel-row>
    </div>

    <div
      v-if="$slots.overlay"
      data-testid="options-panel__overlay"
      class="absolute inset-0 pointer-events-none"
    >
      <slot name="overlay"></slot>
    </div>
  </div>
</template>
