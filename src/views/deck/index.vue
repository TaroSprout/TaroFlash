<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DeckHero from '@/views/deck/deck-hero/index.vue'
import ModeToolbar from './mode-toolbar/index.vue'
import ModeStack from './mode-stack.vue'
import PageDots from './page-dots.vue'
import PageNavButton from './page-nav-button.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { useDeckQuery } from '@/api/decks'
import { useCardListController } from '@/composables/card-editor/card-list-controller'

const { id: deck_id } = defineProps<{
  id: string
}>()

const { t } = useI18n()

const id = computed(() => Number(deck_id))

const image_url = ref<string | undefined>()

const deck_query = useDeckQuery(id)
const deck = deck_query.data

const editor = useCardListController({ deck_id: id.value })

provide('card-editor', editor)

const is_empty = computed(() => !editor.isLoading.value && editor.list.all_cards.value.length === 0)

const { prev_page_number, next_page_number } = editor.carousel
</script>

<template>
  <section
    data-testid="deck-view"
    class="flex md:h-[calc(100dvh-var(--nav-height))] flex-col xl:flex-row items-center xl:items-start gap-6 md:gap-15"
  >
    <deck-hero
      v-if="deck"
      class="xl:sticky top-(--nav-height)"
      :deck="deck"
      :image-url="image_url"
    />

    <div
      data-testid="deck-view__main"
      :data-mode="editor.mode.value"
      class="md:h-full relative w-full grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] grid-rows-[auto_minmax(0,1fr)_auto] gap-x-4 gap-y-4 pb-4"
    >
      <mode-toolbar class="sm:col-start-2" />

      <page-nav-button direction="prev">
        {{ t('deck-view.actions.prev-page', { page: prev_page_number }) }}
      </page-nav-button>

      <div v-if="is_empty" data-testid="deck-view__empty" class="sm:row-start-2 sm:col-start-2" />
      <mode-stack v-else class="sm:row-start-2 sm:col-start-2" />

      <page-nav-button direction="next">
        {{ t('deck-view.actions.next-page', { page: next_page_number }) }}
      </page-nav-button>

      <Transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
        <scroll-bar
          v-if="editor.mode.value === 'edit'"
          class="sm:row-start-2 sm:col-start-3 absolute inset-y-10 left-1/2 -translate-x-1/2"
          target="[data-testid='card-list']"
        />
      </Transition>

      <page-dots />
    </div>
  </section>
</template>
