<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLessonCollectionsQuery, useDeleteLessonCollectionMutation } from '@/api/lessons'
import { useToast } from '@/composables/toast'
import { useAlert } from '@/composables/alert'
import { useCollectionCreateModal } from '@/composables/modals/use-collection-create-modal'
import UiButton from '@/components/ui-kit/button.vue'
import CollectionCard from '@/views/audio-reader/collection-card.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const alert = useAlert()
const create_modal = useCollectionCreateModal()
const delete_collection = useDeleteLessonCollectionMutation()

const { data: collections_data, error: collections_error } = useLessonCollectionsQuery()
const collections = computed(() => collections_data.value ?? [])

watch(collections_error, (err) => {
  if (err) toast.error(err.message)
})

function onOpen(collection: LessonCollectionWithCount) {
  router.push({ name: 'lesson-collection', params: { id: collection.id } })
}

async function onCreate() {
  const collection = await create_modal.open().response
  if (collection) router.push({ name: 'lesson-collection', params: { id: collection.id } })
}

async function onDelete(collection: LessonCollectionWithCount) {
  const confirmed = await alert.warn({
    title: t('alert.delete-collection.title'),
    message: t('alert.delete-collection.message'),
    confirmLabel: t('alert.delete-collection.confirm'),
    confirmAudio: 'ui.trash_crumple_short'
  }).response
  if (!confirmed) return

  try {
    await delete_collection.mutateAsync(collection.id)
  } catch {
    toast.error(t('lesson-collections.section.delete-error'))
  }
}
</script>

<template>
  <section data-testid="audio-reader-section" class="flex flex-col gap-6">
    <header data-testid="audio-reader-section__header" class="flex items-center justify-between">
      <h2 class="text-3xl text-brown-700 dark:text-brown-300">
        {{ t('lesson-collections.section.heading') }}
      </h2>

      <ui-button
        data-testid="audio-reader-section__new"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="add"
        size="lg"
        @click="onCreate"
      >
        {{ t('lesson-collections.section.new-button') }}
      </ui-button>
    </header>

    <p
      v-if="collections.length === 0"
      data-testid="audio-reader-section__empty"
      class="text-brown-500 dark:text-grey-400"
    >
      {{ t('lesson-collections.section.empty-fallback') }}
    </p>

    <div v-else data-testid="audio-reader-section__list" class="flex flex-wrap gap-6">
      <collection-card
        v-for="collection in collections"
        :key="collection.id"
        :collection="collection"
        @open="onOpen(collection)"
        @delete="onDelete(collection)"
      />
    </div>
  </section>
</template>
