<script setup lang="ts">
import UiDropdownButton from '@/components/ui-kit/dropdown-button/index.vue'
import StudyButton from './study-button.vue'
import SearchBar from '@/views/deck/search-bar.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardSearchKey, useCardEditMenu } from '@/views/deck/composables'
import { useMatchMedia } from '@/composables/ui/media-query'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'

type ActionsProps = {
  deck: Deck
  // Selection mode disables the study button and the edit-cards dropdown —
  // neither makes sense while bulk-selecting cards.
  isSelecting?: boolean
}

const { deck, isSelecting = false } = defineProps<ActionsProps>()

const { t } = useI18n()
const menu = useCardEditMenu()
const is_mobile = useMatchMedia('w<md')
const { is_searching } = inject(cardSearchKey)!

// Either mode turns the button into a yellow "stop …" toggle.
const is_active_mode = computed(() => menu.is_editing.value || menu.is_rearranging.value)

const edit_label = computed(() => {
  if (menu.is_editing.value) return t('deck-view.actions.stop-editing')
  if (menu.is_rearranging.value) return t('deck-view.actions.reorder-done')
  return t('deck-view.actions.edit-cards')
})
</script>

<template>
  <div data-testid="deck-hero__actions" class="w-full flex flex-row xl:flex-col gap-2">
    <div
      v-if="is_mobile"
      data-testid="deck-hero__mobile-actions"
      class="relative flex w-full flex-row items-center gap-2"
    >
      <search-bar size="xl" fill />

      <Transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
        <div
          v-if="!is_searching"
          data-testid="deck-hero__mobile-actions-rest"
          class="pointer-events-none absolute inset-0 flex flex-row items-center gap-2"
        >
          <div aria-hidden="true" class="aspect-square h-full"></div>

          <div data-testid="deck-hero__study-action" class="pointer-events-auto min-w-0 flex-1">
            <study-button :deck="deck" :disabled="isSelecting" />
          </div>
        </div>
      </Transition>
    </div>

    <div v-else data-testid="deck-hero__study-action" class="flex-1 min-w-0">
      <study-button :deck="deck" :disabled="isSelecting" />
    </div>

    <div v-if="!is_mobile" data-testid="deck-hero__edit-action" class="shrink-0 xl:w-full">
      <ui-dropdown-button
        data-testid="overview-panel__settings-button"
        :options="menu.options.value"
        :icon-left="is_active_mode ? 'stop' : 'edit'"
        :data-theme="is_active_mode ? 'yellow-500' : 'brown-300'"
        :data-theme-dark="is_active_mode ? 'yellow-700' : 'stone-700'"
        full-width
        size="xl"
        :disabled="isSelecting"
        @click="menu.primaryAction"
        @select="menu.onSelect"
      >
        {{ edit_label }}
      </ui-dropdown-button>
    </div>
  </div>
</template>
