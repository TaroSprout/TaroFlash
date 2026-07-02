<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiNavList from '@/components/ui-kit/nav-list.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerDeleteAccountButton from '../danger-delete-account-button.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { settingsLayoutKey } from '../layout'

export type TabIndexNavValue = 'profile' | 'subscription' | 'app' | 'review-preferences'

const { t } = useI18n()
const layout_mode = inject(settingsLayoutKey)!

type NavEntry = { value: TabIndexNavValue; icon: string }
type NavGroup = { key: string; heading: string; entries: NavEntry[] }

const nav_groups = computed<NavGroup[]>(() => [
  {
    key: 'account',
    heading: t('settings.index.account-heading'),
    entries: [
      { value: 'profile', icon: 'user-sticker-square' },
      { value: 'subscription', icon: 'piggy-bank' }
    ]
  },
  {
    key: 'app',
    heading: t('settings.index.app-heading'),
    entries: [
      { value: 'app', icon: 'screwdriver-wrench' },
      { value: 'review-preferences', icon: 'card-deck' }
    ]
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
  <section-list data-testid="tab-index" class="px-(--settings-padding) pb-(--settings-padding)">
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
            label: t(`settings.tab.${entry.value}`)
          }))
        "
        @navigate="onNavigate"
      />
    </labeled-section>

    <settings-save-button v-if="layout_mode === 'sheet'" />

    <labeled-section
      data-testid="tab-index__danger-zone"
      :label="t('settings.header.danger-zone.title')"
    >
      <div data-testid="tab-index__danger-actions" class="flex flex-col gap-2">
        <danger-delete-account-button />
      </div>
    </labeled-section>
  </section-list>
</template>
