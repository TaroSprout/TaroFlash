<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton from '@/components/ui-kit/dropdown-button/index.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudyModal } from '@/components/study-session/composables/study-modal'
import { useCardEditMenu } from '@/views/deck/composables'
import { useMatchMedia } from '@/composables/ui/media-query'

const { deck } = defineProps<{ deck: Deck }>()

const { t } = useI18n()
const study_session = useStudyModal()
const menu = useCardEditMenu()
const is_mobile = useMatchMedia('w<md')

// Either mode turns the button into a yellow "stop …" toggle.
const is_active_mode = computed(() => menu.is_editing.value || menu.is_rearranging.value)
const has_due_cards = computed(() => (deck.due_count ?? 0) > 0)

const edit_label = computed(() => {
  if (menu.is_editing.value) return t('deck-view.actions.stop-editing')
  if (menu.is_rearranging.value) return t('deck-view.actions.reorder-done')
  return t('deck-view.actions.edit-cards')
})

function onStudyClicked() {
  study_session.start(deck)
}
</script>

<template>
  <div data-testid="deck-hero__actions" class="w-full flex flex-row md:flex-col gap-2">
    <div data-testid="deck-hero__study-action" class="flex-1 min-w-0">
      <ui-button
        data-testid="overview-panel__study-button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        full-width
        size="xl"
        :sfx="{ press: 'snappy_button_3' }"
        :disabled="!has_due_cards"
        @press="onStudyClicked"
      >
        <div v-if="has_due_cards" class="text-brown-100">
          {{ t('deck-view.hero.study') }}
          <span
            class="bg-brown-100 dark:text-blue-650 text-blue-500 px-1 py-0.5 -rotate-5 rounded-1.5"
          >
            {{ deck.due_count }}
          </span>
          {{ t('deck-view.hero.cards-label') }}
        </div>
        <div v-else class="text-brown-100">
          {{ t('deck-view.hero.no-cards-due') }}
        </div>
      </ui-button>
    </div>

    <div v-if="!is_mobile" data-testid="deck-hero__edit-action" class="shrink-0 md:w-full">
      <ui-dropdown-button
        data-testid="overview-panel__settings-button"
        :options="menu.options.value"
        :icon-left="is_active_mode ? 'stop' : 'edit'"
        :data-theme="is_active_mode ? 'yellow-500' : 'brown-300'"
        :data-theme-dark="is_active_mode ? 'yellow-700' : 'stone-700'"
        trigger-theme="brown-200"
        full-width
        size="xl"
        @click="menu.primaryAction"
        @select="menu.onSelect"
      >
        {{ edit_label }}
      </ui-dropdown-button>
    </div>
  </div>
</template>
