<script setup lang="ts">
import { computed, onMounted, provide, ref, useTemplateRef } from 'vue'
import DeckHero from '@/views/deck/deck-hero/index.vue'
import ModeToolbar from './mode-toolbar/index.vue'
import ModeStack from './mode-stack.vue'
import { preloadDeckModes } from './modes'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { useDeckQuery } from '@/api/decks'
import {
  cardEditorKey,
  useCardListController
} from '@/composables/card-editor/card-list-controller'
import { deckViewShellKey, useDeckViewShell } from '@/composables/card-editor/deck-view-shell'

const { id: deck_id } = defineProps<{
  id: string
}>()

const id = computed(() => Number(deck_id))

const image_url = ref<string | undefined>()
const toolbar = useTemplateRef<HTMLElement>('toolbar')

const deck_query = useDeckQuery(id)
const deck = deck_query.data

const shell = useDeckViewShell()
provide(deckViewShellKey, shell)

const editor = useCardListController({ deck_id: id.value, shell })
provide(cardEditorKey, editor)

const is_empty = computed(() => !editor.isLoading.value && editor.list.all_cards.value.length === 0)

onMounted(preloadDeckModes)
</script>

<template>
  <section
    data-testid="deck-view"
    class="flex flex-col xl:flex-row items-center xl:items-start gap-6 md:gap-15"
  >
    <deck-hero
      v-if="deck"
      class="relative z-30 xl:sticky xl:top-(--nav-height)"
      :deck="deck"
      :image-url="image_url"
    />

    <div data-testid="deck-view__main" :data-mode="shell.mode.value" class="relative w-full pb-4">
      <div ref="toolbar" data-testid="deck-view__toolbar" class="sticky top-(--nav-height) z-20">
        <div
          data-testid="deck-view__toolbar-backing"
          aria-hidden="true"
          class="absolute inset-x-0 bottom-0 top-[calc(var(--nav-height)*-1)] -z-10 bg-brown-100 dark:bg-grey-900"
        ></div>
        <mode-toolbar />
      </div>

      <div v-if="is_empty" data-testid="deck-view__empty" class="mt-6" />
      <mode-stack v-else class="mt-6" :sticky_header="toolbar" />
    </div>

    <scroll-bar class="fixed right-4 top-(--nav-height) bottom-10 z-30" target="html" />
  </section>
</template>
