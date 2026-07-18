<script setup lang="ts">
import { computed, inject } from 'vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { windowLayoutKey } from './layout'

export type DirectoryPageGroup = {
  key: string
  heading: string
  entries: OptionsPanelEntry[]
}

type DirectoryPageProps = {
  groups: DirectoryPageGroup[]
}

defineProps<DirectoryPageProps>()

defineSlots<{
  footer?(): any
}>()

const emit = defineEmits<{
  navigate: [value: string]
}>()

const layout_mode = inject(windowLayoutKey)

// On phone the scroll container carries no padding, so the directory page owns
// its own inset; on tablet/desktop the container already pads with `--window-px`.
const padding_class = computed(() =>
  layout_mode?.value === 'phone' ? 'px-(--window-px) pb-(--window-px)' : ''
)

function onSelect(value: string) {
  emit('navigate', value)
}
</script>

<template>
  <section-list data-testid="directory-page" :class="padding_class">
    <labeled-section
      v-for="group in groups"
      :key="group.key"
      :data-testid="`directory-page__nav-group--${group.key}`"
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
