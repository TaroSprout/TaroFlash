<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardEditMenu, useEditorSurface } from '@/views/deck/composables'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

const { t } = useI18n()

const shell = inject(deckViewShellKey)!
const surface = useEditorSurface()
const menu = useCardEditMenu()

// Trigger-only here, so the edit action that lives in the desktop primary button
// becomes the first menu entry.
const edit_options = computed<DropdownOption[]>(() => [
  { label: t('deck-view.actions.edit-cards'), value: 'edit', icon: 'edit' },
  ...menu.options.value
])
</script>

<template>
  <div
    data-testid="deck-footer-actions"
    class="flex w-full items-center gap-2 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <ui-button
      neutral
      data-testid="deck-footer-actions__page-settings"
      icon-only
      icon-left="page-setting"
      size="lg"
      @press="shell.openPageSettings()"
    >
      {{ t('deck-view.page-settings.trigger') }}
    </ui-button>

    <ui-button
      v-if="shell.is_rearranging.value"
      data-testid="deck-footer-actions__stop-rearranging"
      icon-left="stop"
      data-palette="yellow"
      full-width
      size="lg"
      @press="shell.toggleRearrange()"
    >
      {{ t('deck-view.actions.reorder-done') }}
    </ui-button>

    <ui-button
      neutral
      v-else
      data-testid="deck-footer-actions__new-card"
      icon-left="card-add"
      variant="ghost"
      full-width
      size="lg"
      @press="surface.openNewCard"
    >
      {{ t('deck-view.mobile-footer.new-card') }}
    </ui-button>

    <ui-dropdown-button
      data-testid="deck-footer-actions__edit-menu"
      trigger-only
      trigger-icon="pencil"
      variant="ghost"
      size="lg"
      position="top-end"
      :options="edit_options"
      @select="menu.onSelect"
    />
  </div>
</template>
