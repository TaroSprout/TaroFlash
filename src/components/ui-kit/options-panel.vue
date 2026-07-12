<script setup lang="ts">
import { useAttrs } from 'vue'
import UiIcon from './icon.vue'
import UiTappable from './tappable.vue'
import { TYPE_SFX } from '@/sfx/config'
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
  if (entry.disabled) return
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
      <component
        :is="interactive ? UiTappable : 'div'"
        v-for="entry in entries"
        :key="entry.value"
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
        class="text-(--theme-on-primary) text-left flex items-center gap-3 p-4"
        :class="[
          interactive ? 'cursor-pointer' : '',
          entry.disabled ? 'pointer-events-none opacity-20' : ''
        ]"
        :bgx_color="interactive ? 'var(--theme-neutral)' : undefined"
        @tap="onSelect(entry)"
      >
        <slot name="leading" :entry="entry">
          <ui-icon
            v-if="entry.icon"
            :src="entry.icon"
            :class="size === 'lg' ? 'size-7' : 'size-6'"
          />
        </slot>

        <span class="flex-1" :class="size === 'lg' ? 'text-lg' : 'text-base'">{{
          entry.label
        }}</span>

        <slot name="trailing" :entry="entry">
          <ui-icon
            v-if="interactive"
            :src="entry.trailingIcon ?? 'line-arrow-right'"
            :class="size === 'lg' ? 'size-5' : 'size-4'"
          />
        </slot>
      </component>
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
