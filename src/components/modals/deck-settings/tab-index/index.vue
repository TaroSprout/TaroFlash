<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerResetButton from '../danger-reset-button.vue'
import DangerDeleteButton from '../danger-delete-button.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
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

function onNavigate(value: TabIndexNavValue) {
  emitSfx('snappy_button_5')
  emit('navigate', value)
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
      <div
        data-testid="tab-index__nav-list"
        class="flex flex-col rounded-4 bg-input dark:bg-stone-700 overflow-hidden"
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
          <span class="flex-1">{{ t(`deck.settings-modal.tab.${entry.value}`) }}</span>
          <ui-icon src="line-arrow-right" class="size-4" />
        </ui-tappable>
      </div>
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
