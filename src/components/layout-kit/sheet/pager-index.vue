<script setup lang="ts">
import { computed, inject } from 'vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { sheetLayoutKey } from './sheet-layout'

export type PagerIndexGroup = {
  key: string
  heading: string
  entries: OptionsPanelEntry[]
}

type PagerIndexProps = {
  groups: PagerIndexGroup[]
}

defineProps<PagerIndexProps>()

defineSlots<{
  footer?(): any
}>()

const emit = defineEmits<{
  navigate: [value: string]
}>()

const layout_mode = inject(sheetLayoutKey)

// On phone the scroll container carries no padding, so the index owns its own
// inset; on tablet/desktop the container already pads with `--sheet-px`.
const padding_class = computed(() =>
  layout_mode?.value === 'phone' ? 'px-(--sheet-px) pb-(--sheet-px)' : ''
)

function onSelect(value: string) {
  emit('navigate', value)
}
</script>

<template>
  <section-list data-testid="tab-index" :class="padding_class">
    <labeled-section
      v-for="group in groups"
      :key="group.key"
      :data-testid="`tab-index__nav-group--${group.key}`"
      :label="group.heading"
    >
      <ui-options-panel
        :entries="group.entries"
        :sfx="{ press: 'snappy_button_5' }"
        @select="onSelect"
      />
    </labeled-section>

    <slot name="footer"></slot>
  </section-list>
</template>
