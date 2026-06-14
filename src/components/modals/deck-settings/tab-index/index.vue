<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import DangerResetButton from '../danger-reset-button.vue'
import DangerDeleteButton from '../danger-delete-button.vue'
import { ref } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { deckEditorKey } from '@/composables/deck-editor'
import { deckSettingsLayoutKey } from '../layout'
import { usePlayOnTap } from '@/composables/use-play-on-tap'

export type TabIndexNavValue = 'design' | 'study'

const { t } = useI18n()
const { settings } = inject(deckEditorKey)!
const layout_mode = inject(deckSettingsLayoutKey)!

type NavEntry = { value: TabIndexNavValue; icon: string }
type NavGroup = { key: string; heading: string; entries: NavEntry[] }

const nav_groups = computed<NavGroup[]>(() => [
  {
    key: 'appearance',
    heading: t('deck.settings-modal.index.general-heading'),
    entries: [{ value: 'design', icon: 'design-services' }]
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

const { interceptClick } = usePlayOnTap({ animate: false })
const playing_entry = ref<TabIndexNavValue | null>(null)

function onNavClickCapture(e: MouseEvent, value: TabIndexNavValue) {
  interceptClick(e, {
    beforePlay: () => {
      playing_entry.value = value
    },
    onAfter: () => {
      emitSfx('ui.snappy_button_5', { blocking: true })
      emit('navigate', value)
      playing_entry.value = null
    }
  })
}

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
        v-if="group.key === 'appearance' && layout_mode === 'sheet'"
        data-testid="tab-index__identity-inputs"
        class="flex flex-col gap-2 mb-3"
      >
        <ui-input
          :placeholder="t('deck.title-placeholder')"
          text-align="center"
          size="lg"
          v-model:value="settings.title"
        />
        <ui-textarea
          :placeholder="t('deck.description-placeholder')"
          :max_chars="100"
          rows="3"
          v-model:value="settings.description"
        />
      </div>

      <div
        data-testid="tab-index__nav-list"
        class="flex flex-col rounded-4 bg-input overflow-hidden"
      >
        <button
          v-for="entry in group.entries"
          :key="entry.value"
          type="button"
          data-testid="tab-index__nav-card"
          :data-value="entry.value"
          :data-playing="playing_entry === entry.value || null"
          class="relative group/nav-card flex items-center gap-3 p-4 text-brown-700 dark:text-brown-100 hover:bg-(--theme-neutral) hover:text-(--theme-on-neutral) group-data-[playing=true]/nav-card:bg-(--theme-neutral) group-data-[playing=true]/nav-card:text-(--theme-on-neutral) cursor-pointer text-left"
          v-sfx.hover="'ui.click_07'"
          @click.capture="onNavClickCapture($event, entry.value)"
          @click="onNavigate(entry.value)"
        >
          <ui-icon :src="entry.icon" class="w-6 h-6" />
          <span class="flex-1">{{ t(`deck.settings-modal.tab.${entry.value}`) }}</span>
          <ui-icon src="chevron-right" class="w-6 h-6" />
          <div
            class="absolute inset-0 bgx-diagonal-stripes bgx-color-[var(--theme-neutral)] animation-safe:bgx-slide pointer-events-none hidden group-data-[playing=true]/nav-card:block"
          />
        </button>
      </div>
    </labeled-section>

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
