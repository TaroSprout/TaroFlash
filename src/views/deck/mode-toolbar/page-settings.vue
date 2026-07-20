<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import PageSettingsPanel from './page-settings-panel.vue'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { useMatchMedia } from '@/composables/ui/media-query'
import { provideDepth } from '@/composables/ui/depth'
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

// The popover teleports out of the deck view, so its content can't inherit the
// page's depth. Declare depth 1 explicitly (matching the data-depth stamped on
// the panel) so the sorting dropdown inside resolves `element` against this
// floating panel rather than the root page's depth 0 — otherwise it paints
// element@0 (brown-300), the same colour as the panel, and vanishes.
provideDepth(1)

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
      data-depth="1"
      class="rounded-7 bg-surface p-4 bevel-drop-sm"
    >
      <page-settings-panel />
    </div>

    <template #arrow>
      <div
        data-depth="1"
        class="ui-kit-popover__arrow-default [--popover-arrow-color:var(--color-surface)]"
      />
    </template>
  </ui-popover>
</template>
