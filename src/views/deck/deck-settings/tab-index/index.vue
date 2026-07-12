<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiOptionsPanel from '@/components/ui-kit/options-panel/index.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerResetButton from '../danger-reset-button.vue'
import DangerDeleteButton from '../danger-delete-button.vue'
import { deckSettingsLayoutKey } from '../layout'
import DeckSaveButton from '../deck-save-button.vue'
import { TAB_META, type TabValue } from '../tabs'

export type TabIndexNavValue = Exclude<TabValue, 'danger-zone'>

const { t } = useI18n()
const layout_mode = inject(deckSettingsLayoutKey)!

type NavGroup = { key: string; heading: string; entries: TabIndexNavValue[] }

const nav_groups = computed<NavGroup[]>(() => [
  {
    key: 'appearance',
    heading: t('deck.settings-modal.index.general-heading'),
    entries: layout_mode.value === 'sheet' ? ['details', 'design'] : ['design']
  },
  {
    key: 'study',
    heading: t('deck.settings-modal.index.study-heading'),
    entries: ['study']
  }
])

const emit = defineEmits<{
  navigate: [value: TabIndexNavValue]
}>()

function onSelect(value: string) {
  emit('navigate', value as TabIndexNavValue)
}
</script>

<template>
  <section-list
    data-testid="tab-index"
    class="px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <labeled-section
      v-for="group in nav_groups"
      :key="group.key"
      :data-testid="`tab-index__nav-group--${group.key}`"
      :label="group.heading"
    >
      <ui-options-panel
        :entries="
          group.entries.map((value) => ({
            value,
            icon: TAB_META[value].icon,
            label: t(TAB_META[value].labelKey)
          }))
        "
        :sfx="{ press: 'snappy_button_5' }"
        @select="onSelect"
      />
    </labeled-section>

    <deck-save-button v-if="layout_mode === 'sheet'" />

    <labeled-section
      data-testid="tab-index__danger-zone"
      :label="t(TAB_META['danger-zone'].labelKey)"
    >
      <div data-testid="tab-index__danger-actions" class="flex flex-col gap-2">
        <danger-reset-button />
        <danger-delete-button />
      </div>
    </labeled-section>
  </section-list>
</template>
