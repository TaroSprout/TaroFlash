<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiOptionsPanel from '@/components/ui-kit/options-panel/index.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { settingsLayoutKey } from '../layout'
import { TAB_META, type TabValue } from '../tabs'

export type TabIndexNavValue = TabValue

const { t } = useI18n()
const layout_mode = inject(settingsLayoutKey)!

type NavGroup = { key: string; heading: string; entries: TabIndexNavValue[] }

const nav_groups = computed<NavGroup[]>(() => [
  {
    key: 'account',
    heading: t('settings.index.account-heading'),
    entries:
      layout_mode.value === 'sheet'
        ? ['profile', 'subscription', 'account-access']
        : ['profile', 'subscription']
  },
  {
    key: 'app',
    heading: t('settings.index.app-heading'),
    entries: ['app', 'danger-zone']
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
  <section-list data-testid="tab-index" class="px-(--settings-padding) pb-(--settings-padding)">
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

    <settings-save-button v-if="layout_mode === 'sheet'" />
  </section-list>
</template>
