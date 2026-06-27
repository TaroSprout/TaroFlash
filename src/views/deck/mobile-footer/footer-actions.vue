<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import SearchBar from '@/views/deck/search-bar.vue'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardSearchKey } from '@/views/deck/composables'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'

const { t } = useI18n()

const { is_searching } = inject(cardSearchKey)!
const shell = inject(deckViewShellKey)!

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
          {{ t('deck-view.actions.stop-rearranging') }}
        </ui-button>

        <ui-button
          v-else
          data-testid="deck-footer-actions__new-card"
          class="pointer-events-auto"
          icon-left="add"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          variant="ghost"
          full-width
          size="lg"
        >
          {{ t('deck-view.mobile-footer.new-card') }}
        </ui-button>

        <ui-button
          data-testid="deck-footer-actions__view-options"
          class="pointer-events-auto"
          icon-only
          icon-left="page-setting"
          data-theme="brown-200"
          data-theme-dark="stone-700"
          variant="ghost"
          size="lg"
        >
          {{ t('deck-view.mobile-footer.view-options') }}
        </ui-button>
      </div>
    </Transition>
  </div>
</template>
