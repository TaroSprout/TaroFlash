<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerDeleteAccountButton from '../danger-delete-account-button.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import { settingsLayoutKey } from '../../layout'

export type TabIndexNavValue = 'profile' | 'subscription' | 'app'

const { t } = useI18n()
const layout_mode = inject(settingsLayoutKey)!

type NavEntry = { value: TabIndexNavValue; icon: string }
type NavGroup = { key: string; heading: string; entries: NavEntry[] }

const nav_groups = computed<NavGroup[]>(() => [
  {
    key: 'account',
    heading: t('settings.index.account-heading'),
    entries: [
      { value: 'profile', icon: 'id-card' },
      { value: 'subscription', icon: 'moon-stars' }
    ]
  },
  {
    key: 'app',
    heading: t('settings.index.app-heading'),
    entries: [{ value: 'app', icon: 'music-note' }]
  }
])

const emit = defineEmits<{
  navigate: [value: TabIndexNavValue]
}>()

function onNavigate(value: TabIndexNavValue) {
  emitSfx('ui.snappy_button_5', { blocking: true })
  emit('navigate', value)
}
</script>

<template>
  <section-list data-testid="tab-index">
    <labeled-section
      v-for="group in nav_groups"
      :key="group.key"
      :data-testid="`tab-index__nav-group--${group.key}`"
      :label="group.heading"
    >
      <div
        data-testid="tab-index__nav-list"
        class="flex flex-col rounded-4 bg-input overflow-hidden"
      >
        <ui-tappable
          v-for="entry in group.entries"
          :key="entry.value"
          as="button"
          type="button"
          data-testid="tab-index__nav-card"
          :data-value="entry.value"
          class="flex items-center gap-3 p-4 text-brown-700 dark:text-brown-100 hover:bg-(--theme-neutral) hover:text-(--theme-on-neutral) cursor-pointer text-left"
          bgx_color="var(--color-brown-500)"
          v-sfx="{ hover: TYPE_SFX }"
          @tap="onNavigate(entry.value)"
        >
          <ui-icon :src="entry.icon" class="w-6 h-6" />
          <span class="flex-1">{{ t(`settings.tab.${entry.value}`) }}</span>
          <ui-icon src="chevron-right" class="w-6 h-6" />
        </ui-tappable>
      </div>
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
