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

// Below md the mode-toolbar (and this popover) is only CSS-hidden, not
// unmounted — the mobile footer's own panel drives `is_page_settings_open`
// there instead. Gating `open` on `!is_mobile` keeps this popover's
// outside-click listener from ever attaching on mobile, which would otherwise
// treat every tap inside the footer panel as a click outside and close it.
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
      class="rounded-7 bg-brown-300 p-4 dark:bg-stone-900 filter-[drop-shadow(var(--drop-shadow-sm))_drop-shadow(-1px_-1px_0_var(--color-brown-100))] dark:filter-[drop-shadow(var(--drop-shadow-sm))_drop-shadow(-1px_-1px_0_var(--color-stone-950))]"
    >
      <page-settings-panel />
    </div>

    <template #arrow>
      <div
        class="ui-kit-popover__arrow-default [--popover-arrow-color:var(--color-brown-300)] dark:[--popover-arrow-color:var(--color-stone-900)]"
      />
    </template>
  </ui-popover>
</template>
