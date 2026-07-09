<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useChangeCard, type ChangeCardResponse } from './use-change-cc'

export type { ChangeCardResponse }

type ChangeCardModalProps = {
  has_existing_card?: boolean
  close: (response?: ChangeCardResponse) => void
}

const { has_existing_card = false, close } = defineProps<ChangeCardModalProps>()

const { t } = useI18n()
const { is_loading, is_submitting, is_ready, load_error, onSubmit } = useChangeCard(close)

const title = computed(() =>
  has_existing_card
    ? t('settings.subscription.change-card.change-title')
    : t('settings.subscription.change-card.add-title')
)
const submit_label = computed(() =>
  has_existing_card
    ? t('settings.subscription.change-card.change-submit')
    : t('settings.subscription.change-card.add-submit')
)
</script>

<template>
  <dialog-card
    data-testid="change-card-modal"
    class="pb-6"
    bg_class="bg-brown-100 dark:bg-grey-800"
    size="lg"
    data-theme="brown-300"
    data-theme-dark="stone-700"
    :title="title"
    :close_disabled="is_submitting"
    @close="close()"
  >
    <template #default="{ viewport }">
      <div
        data-testid="change-card-modal__scroll-area"
        :data-full-bleed="viewport === 'mobile'"
        class="flex min-h-0 flex-1 flex-col justify-between gap-4 h-full pt-4"
        :class="viewport === 'mobile' ? 'overflow-y-auto scroll-hidden' : ''"
      >
        <div data-testid="change-card-modal__body" class="flex flex-col gap-4">
          <p
            v-if="is_loading"
            data-testid="change-card-modal__loading"
            class="text-brown-700 dark:text-brown-100 py-10 text-center"
          >
            {{ t('settings.subscription.change-card.loading') }}
          </p>
          <p
            v-else-if="load_error"
            data-testid="change-card-modal__error"
            class="py-10 text-center text-red-500 dark:text-red-600"
          >
            {{ t('settings.subscription.change-card.error') }}
          </p>
          <div ref="container" data-testid="change-card-modal__payment-element"></div>
        </div>

        <div
          v-if="!is_loading && !load_error"
          data-testid="change-card-modal__footer"
          class="shrink-0"
        >
          <ui-button
            data-testid="change-card-modal__submit"
            data-theme="blue-500"
            data-theme-dark="blue-650"
            full-width
            size="lg"
            :loading="is_submitting"
            :disabled="!is_ready"
            @press="onSubmit"
          >
            {{ submit_label }}
          </ui-button>
        </div>
      </div>
    </template>
  </dialog-card>
</template>
