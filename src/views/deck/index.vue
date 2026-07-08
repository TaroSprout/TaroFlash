<script setup lang="ts">
import { computed, provide, ref, useTemplateRef } from 'vue'
import DeckHero from '@/views/deck/deck-hero/index.vue'
import DeckSkeleton from './skeleton.vue'
import ModeToolbar from './mode-toolbar/index.vue'
import ModeToolbarSkeleton from './mode-toolbar/skeleton.vue'
import ModeStack from './mode-stack.vue'
import CardGridSkeleton from './card-grid/skeleton.vue'
import CardGridEmpty from './card-grid/empty-state.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import DeckMobileFooter from './mobile-footer/index.vue'
import { useDeckQuery } from '@/api/decks'
import {
  cardEditorKey,
  cardSearchKey,
  useCardListController,
  useCardSearch
} from '@/views/deck/composables'
import { deckViewShellKey, useDeckViewShell } from '@/views/deck/composables/view-shell'
import { mobileCardEditorKey, useMobileCardEditor } from './mobile-editor/use-mobile-card-editor'
import { useMatchMedia } from '@/composables/ui/media-query'

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

// query text is owned here so it can be fed into the list controller (for the
// RPC) and into useCardSearch (so the search bar can read/write it) without
// either composable depending on the other.
const search_query = ref<string>('')

const editor = useCardListController({ deck_id: id.value, shell, search_query })
provide(cardEditorKey, editor)

const search = useCardSearch(search_query, editor.list.all_cards, editor.isLoading)
provide(cardSearchKey, search)

const mobile_editor = useMobileCardEditor(editor)
provide(mobileCardEditorKey, mobile_editor)

const is_mobile = useMatchMedia('w<md')

const view_state = computed<'loading' | 'empty' | 'ready'>(() => {
  if (editor.list.all_cards.value.length > 0) return 'ready'
  if (search.is_active.value) return 'ready'
  return editor.isLoading.value ? 'loading' : 'empty'
})

const show_skeleton = computed(() => !deck.value)
</script>

<template>
  <deck-skeleton v-if="show_skeleton" />

  <section v-else data-testid="deck-view" class="flex flex-col px-(--page-px) pt-(--page-pt) gap-3">
    <div class="flex flex-col xl:flex-row items-center xl:items-start gap-6 md:gap-15">
      <deck-hero
        class="relative z-30 xl:sticky xl:top-(--nav-height)"
        :deck="deck!"
        :image-url="image_url"
        :hide-actions="view_state === 'empty'"
      />

      <div
        data-testid="deck-view__main"
        :data-mode="shell.mode.value"
        class="relative w-full"
        :class="
          view_state === 'empty'
            ? 'xl:flex xl:flex-col xl:h-[calc(100dvh-var(--nav-height))]'
            : 'pb-[calc(1rem+var(--mobile-dock-height,0px))]'
        "
      >
        <div
          ref="toolbar"
          data-testid="deck-view__toolbar"
          class="sticky top-(--nav-height) z-20 max-md:hidden"
        >
          <div
            data-testid="deck-view__toolbar-backing"
            aria-hidden="true"
            class="absolute inset-x-0 bottom-0 top-[calc(var(--nav-height)*-1)] -z-10 bg-brown-100 dark:bg-grey-900"
          ></div>
          <mode-toolbar-skeleton v-if="view_state === 'empty'" />
          <mode-toolbar v-else />
        </div>

        <card-grid-empty
          v-if="view_state === 'empty'"
          data-testid="deck-view__empty"
          class="md:mt-6"
        />
        <card-grid-skeleton v-else-if="view_state === 'loading'" class="md:mt-6" />
        <mode-stack v-else class="md:mt-6" :sticky_header="toolbar" />
      </div>
    </div>

    <scroll-bar
      v-if="view_state === 'ready'"
      class="fixed right-4 top-(--nav-height) bottom-10 z-30"
      target="html"
    />

    <deck-mobile-footer v-if="is_mobile" />
  </section>
</template>
