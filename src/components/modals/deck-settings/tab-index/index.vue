<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiNavList from '@/components/ui-kit/nav-list.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerResetButton from '../danger-reset-button.vue'
import DangerDeleteButton from '../danger-delete-button.vue'
import { deckSettingsLayoutKey } from '../layout'
import DeckSaveButton from '../deck-save-button.vue'

export type TabIndexNavValue = 'details' | 'design' | 'study'

const { t } = useI18n()
const layout_mode = inject(deckSettingsLayoutKey)!

type NavEntry = { value: TabIndexNavValue; icon: string }
type NavGroup = { key: string; heading: string; entries: NavEntry[] }

const nav_groups = computed<NavGroup[]>(() => [
  {
    key: 'appearance',
    heading: t('deck.settings-modal.index.general-heading'),
    entries:
      layout_mode.value === 'sheet'
        ? [
            { value: 'details', icon: 'text-field' },
            { value: 'design', icon: 'paint-brush' }
          ]
        : [{ value: 'design', icon: 'paint-brush' }]
  },
  {
    key: 'study',
    heading: t('deck.settings-modal.index.study-heading'),
    entries: [{ value: 'study', icon: 'school-cap' }]
  }
])

const emit = defineEmits<{
  navigate: [value: TabIndexNavValue]
}>()

function onNavigate(value: string) {
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
      <ui-nav-list
        :entries="
          group.entries.map((entry) => ({
            value: entry.value,
            icon: entry.icon,
            label: t(`deck.settings-modal.tab.${entry.value}`)
          }))
        "
        @navigate="onNavigate"
      />
    </labeled-section>

    <deck-save-button v-if="layout_mode === 'sheet'" />

    <labeled-section
      data-testid="tab-index__danger-zone"
      :label="t('deck.settings-modal.header.danger-zone.title')"
    >
      <div data-testid="tab-index__danger-actions" class="flex flex-col gap-2">
        <danger-reset-button />
        <danger-delete-button />
      </div>
    </labeled-section>
  </section-list>
</template>
