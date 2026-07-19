<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLessonCollectionsQuery } from '@/api/lessons'
import { useNoticeStore } from '@/stores/notice-store'
import { useOpenCollection } from '@/composables/audio-reader/open-collection'
import { useCollectionCreateModal } from '@/composables/audio-reader/collection-create-modal'
import { useCollectionEditModal } from '@/composables/audio-reader/collection-edit-modal'
import UiButton from '@/components/ui-kit/button.vue'
import CollectionCard from '@/views/audio-reader/collection-card.vue'

const { t } = useI18n()
const notice = useNoticeStore()
const { openCollection } = useOpenCollection()
const create_modal = useCollectionCreateModal()
const edit_modal = useCollectionEditModal()

const { data: collections_data, error: collections_error } = useLessonCollectionsQuery()
const collections = computed(() => collections_data.value ?? [])

function onOpen(collection: LessonCollectionWithCount) {
  openCollection(collection)
}

function onEdit(collection: LessonCollectionWithCount) {
  edit_modal.open(collection.id)
}

async function onCreate() {
  // A fresh collection has no chapters yet, so drop straight into its edit modal
  // to upload the first lesson.
  const collection = await create_modal.open().response
  if (collection) edit_modal.open(collection.id)
}

watch(collections_error, (err) => {
  if (err) notice.error(t('lesson-collections.section.load-error'))
})
</script>

<template>
  <section data-testid="audio-reader-section" class="flex flex-col gap-6">
    <header data-testid="audio-reader-section__header" class="flex items-center justify-between">
      <h2 class="text-3xl text-ink">
        {{ t('lesson-collections.section.heading') }}
      </h2>

      <ui-button
        data-testid="audio-reader-section__new"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="add"
        size="lg"
        @press="onCreate"
      >
        {{ t('lesson-collections.section.new-button') }}
      </ui-button>
    </header>

    <p
      v-if="collections.length === 0"
      data-testid="audio-reader-section__empty"
      class="text-ink-muted"
    >
      {{ t('lesson-collections.section.empty-fallback') }}
    </p>

    <div v-else data-testid="audio-reader-section__list" class="flex flex-wrap gap-6">
      <collection-card
        v-for="collection in collections"
        :key="collection.id"
        :collection="collection"
        @open="onOpen(collection)"
        @edit="onEdit(collection)"
      />
    </div>
  </section>
</template>
