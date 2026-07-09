<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiThemePicker from '@/components/ui-kit/theme-picker.vue'
import UiPatternPicker from '@/components/ui-kit/pattern-picker.vue'
import IconPicker from './icon-picker.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import { SUPPORTED_THEMES, SUPPORTED_PATTERNS, SUPPORTED_ICONS } from '@/utils/cover'

type CoverDesignerToolbarProps = {
  config: DeckCover
}

const { config } = defineProps<CoverDesignerToolbarProps>()
const { t } = useI18n()
</script>

<template>
  <div
    data-testid="cover-designer-toolbar"
    :data-theme="config.theme"
    :data-theme-dark="config.theme_dark"
  >
    <section-list data-testid="cover-designer-toolbar__controls">
      <ui-theme-picker
        :label="t('deck.settings-modal.cover.bg-color')"
        :supported_themes="SUPPORTED_THEMES"
        :theme="config.theme"
        :theme_dark="config.theme_dark"
        @update:theme="config.theme = $event"
        @update:theme_dark="config.theme_dark = $event"
      />

      <ui-pattern-picker
        :label="t('deck.settings-modal.cover.pattern')"
        :supported_patterns="SUPPORTED_PATTERNS"
        :selected_pattern="config.pattern"
        @update:pattern="config.pattern = $event"
      />

      <icon-picker
        :supported_icons="SUPPORTED_ICONS"
        :icon="config.icon"
        @update:icon="config.icon = $event"
      />
    </section-list>
  </div>
</template>
