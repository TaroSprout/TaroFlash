<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import SearchBar from '@/views/deck/search-bar.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardSearchKey, useCardEditMenu } from '@/views/deck/composables'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'

const { t } = useI18n()

const { is_searching } = inject(cardSearchKey)!
const shell = inject(deckViewShellKey)!
const menu = useCardEditMenu()

// Trigger-only here, so the edit action that lives in the desktop primary button
// becomes the first menu entry.
const edit_options = computed<DropdownOption[]>(() => [
  { label: t('deck-view.actions.edit-cards'), value: 'edit', icon: 'edit' },
  ...menu.options.value
])

function onActionsEnter(el: Element, done: () => void) {
  fadeEnter(el, done)
}

function onActionsLeave(el: Element, done: () => void) {
  fadeLeave(el, done)
}
</script>

<template>
  <div
    data-testid="deck-footer-actions"
    class="relative flex w-full items-center gap-2 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <search-bar size="lg" fill data-theme="brown-200" data-theme-dark="stone-700" />

    <Transition :css="false" @enter="onActionsEnter" @leave="onActionsLeave">
      <div
        v-if="!is_searching"
        data-testid="deck-footer-actions__rest"
        class="pointer-events-none absolute inset-x-(--dock-px) top-(--dock-pt) bottom-(--dock-pb) flex items-center gap-2"
      >
        <div aria-hidden="true" class="aspect-square h-full"></div>

        <ui-button
          v-if="shell.is_rearranging.value"
          data-testid="deck-footer-actions__stop-rearranging"
          class="pointer-events-auto"
          icon-left="stop"
          data-theme="yellow-500"
          data-theme-dark="yellow-700"
          full-width
          size="lg"
          @press="shell.toggleRearrange()"
        >
          {{ t('deck-view.actions.reorder-done') }}
        </ui-button>

        <ui-button
          v-else
          data-testid="deck-footer-actions__new-card"
          class="pointer-events-auto"
          icon-left="card-add"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          variant="ghost"
          full-width
          size="lg"
        >
          {{ t('deck-view.mobile-footer.new-card') }}
        </ui-button>

        <ui-dropdown-button
          data-testid="deck-footer-actions__edit-menu"
          class="pointer-events-auto"
          trigger-only
          trigger-icon="pencil"
          trigger-theme="brown-200"
          trigger-theme-dark="stone-700"
          menu-theme="brown-200"
          menu-theme-dark="stone-700"
          menu-class="outline-1 outline-brown-300 dark:outline-grey-900"
          variant="ghost"
          size="lg"
          position="top-end"
          :options="edit_options"
          @select="menu.onSelect"
        />
      </div>
    </Transition>
  </div>
</template>
