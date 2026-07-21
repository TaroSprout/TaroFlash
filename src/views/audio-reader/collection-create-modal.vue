<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiInput from '@/components/ui-kit/input.vue'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import { useCreateLessonCollectionMutation } from '@/api/lessons'
import { useOverlayContext } from '@/composables/overlay/overlay-context'

export type CollectionCreateResponse = LessonCollection | undefined

const { t } = useI18n()
const { close, dismiss } = useOverlayContext()
const create = useCreateLessonCollectionMutation()

const title = ref('')
const error_key = ref<string | null>(null)

const can_submit = computed(() => title.value.trim().length > 0)

async function onSubmit() {
  if (!can_submit.value) return

  error_key.value = null
  try {
    const collection = await create.mutateAsync(title.value.trim())
    close(collection)
  } catch {
    error_key.value = 'lesson-collections.create.error'
  }
}
</script>

<template>
  <app-window
    data-testid="collection-create-container"
    data-palette="blue"
    class="sm:w-150"
    sheet_at="w<sm | h<sm"
    :title="t('lesson-collections.create.title')"
    @close="dismiss"
  >
    <div data-testid="collection-create__body" class="flex flex-col gap-5 p-6">
      <ui-input
        data-testid="collection-create__title"
        :placeholder="t('lesson-collections.create.title-placeholder')"
        size="lg"
        v-model:value="title"
        @keyup.enter="onSubmit"
      />

      <p
        v-if="error_key"
        data-testid="collection-create__error"
        data-palette="danger"
        class="text-sm text-(--color-accent)"
      >
        {{ t(error_key) }}
      </p>

      <div data-testid="collection-create__actions" class="flex gap-3">
        <ui-button
          neutral
          icon-left="close"
          size="lg"
          full-width
          :disabled="create.isLoading.value"
          @press="dismiss()"
        >
          {{ t('lesson-collections.create.cancel-button') }}
        </ui-button>

        <ui-button
          data-palette="brand"
          icon-left="add"
          size="lg"
          full-width
          :disabled="!can_submit || create.isLoading.value"
          @press="onSubmit"
        >
          {{ t('lesson-collections.create.submit-button') }}
        </ui-button>
      </div>
    </div>
  </app-window>
</template>
