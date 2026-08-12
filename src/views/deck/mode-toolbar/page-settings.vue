<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import PageSettingsPanel from './page-settings-panel.vue'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { useMatchMedia } from '@/composables/ui/media-query'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ButtonProps } from '@/components/ui-kit/button.vue'

type PageSettingsProps = {
  size?: ButtonProps['size']
}

const { size = 'base' } = defineProps<PageSettingsProps>()

const { t } = useI18n()

const { is_page_settings_open, openPageSettings, closePageSettings } = inject(deckViewShellKey)!
const is_mobile = useMatchMedia('w<md')

// Gated so this popover's outside-click listener never attaches on mobile,
// where the footer's own panel drives `is_page_settings_open` instead.
const desktop_open = computed(() => is_page_settings_open.value && !is_mobile.value)

function toggle() {
  if (is_page_settings_open.value) closePageSettings()
  else openPageSettings()
}
</script>

<template>
  <ui-popover
    :open="desktop_open"
    position="bottom"
    :gap="4"
    :transition_duration="0"
    shadow
    teleport
    data-testid="page-settings"
    @close="closePageSettings"
  >
    <template #trigger>
      <ui-button
        neutral
        data-testid="page-settings__trigger"
        :size="size"
        icon-left="page-setting"
        icon-only
        :data-active="desktop_open"
        @press="toggle"
      >
        {{ t('deck-view.page-settings.trigger') }}
      </ui-button>
    </template>

    <div
      data-testid="page-settings__panel"
      data-station="float"
      class="rounded-7 bg-surface p-4 bevel-drop-sm"
    >
      <page-settings-panel />
    </div>

    <template #arrow>
      <div
        data-station="float"
        class="ui-kit-popover__arrow-default [--popover-arrow-color:var(--color-surface)]"
      />
    </template>
  </ui-popover>
</template>
