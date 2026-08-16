<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import OptionsPanelRow from './row.vue'
import ScrollRegion from '@/components/layout-kit/scroll-region/index.vue'
import type { SfxOptions } from '@/sfx/directive'

export type OptionsPanelEntry = {
  value: string
  label: string
  icon?: string
  // replaces the trailing chevron; falls back to 'line-arrow-right' when interactive
  trailingIcon?: string
  disabled?: boolean
  // renders the row's icon + label in the danger red, for destructive options
  danger?: boolean
  selected?: boolean
  // data-palette applied while selected; the selected background reads off this
  // palette's --color-accent, so omitting it falls back to the panel's ambient.
  selectedPalette?: Palette
}

type OptionsPanelProps = {
  entries: OptionsPanelEntry[]
  size?: 'base' | 'lg'
  // press sound is entirely the call site's call — pass `{ press: 'xxx' }`
  sfx?: SfxOptions
  // false renders plain rows with no tap/hover/sfx behavior (static info/status rows)
  interactive?: boolean
  // scrolls internally instead of clipping, drawing the standard handle in a gutter
  // just beside the panel — a host that clips its own overflow cuts that handle off
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

const content_testid = computed(() =>
  attrs['data-testid'] ? `${attrs['data-testid']}__content` : 'options-panel__content'
)

const content_component = computed(() => (scrollable ? ScrollRegion : 'div'))

/**
 * What the scrolling variant hands its region.
 *
 * The handle hangs beside the panel rather than within it: the `window`
 * station paints `raised` and `well` the same colour, so a bar drawn over
 * this panel would be invisible. →[K:station-roles-can-collide]
 */
const content_bindings = computed(() => (scrollable ? { gutter: 'outside' as const } : {}))

function onSelect(entry: OptionsPanelEntry) {
  emit('select', entry.value)
}
</script>

<template>
  <div data-testid="options-panel" class="relative flex flex-col">
    <component
      :is="content_component"
      :data-testid="content_testid"
      v-bind="content_bindings"
      class="flex min-h-0 flex-1 flex-col rounded-4 bg-well p-1"
      :class="scrollable ? '' : 'overflow-hidden'"
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
    </component>

    <div
      v-if="$slots.overlay"
      data-testid="options-panel__overlay"
      class="absolute inset-0 pointer-events-none"
    >
      <slot name="overlay"></slot>
    </div>
  </div>
</template>
