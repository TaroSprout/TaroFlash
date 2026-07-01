<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useCreateSetupIntentMutation } from '@/api/billing'
import { useCheckoutElements } from '@/composables/billing/use-checkout-elements'

export type AddCreditCardResponse = { added: boolean; paymentMethodId: string | null }

const { close } = defineProps<{
  close: (response?: AddCreditCardResponse) => void
}>()

const { t } = useI18n()
const queryCache = useQueryCache()
const { mutateAsync: createSetupIntent } = useCreateSetupIntentMutation()

const { container_ref, is_loading, is_submitting, is_ready, load_error, submit_error, confirm } =
  useCheckoutElements({
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    genericErrorMessage: t('settings.subscription.add-credit-card.submit-error'),
    getClientSecret: async () => {
      const { clientSecret } = await createSetupIntent(window.location.origin)
      return clientSecret
    }
  })

async function onSubmit() {
  const outcome = await confirm()
  if (outcome.status !== 'success') return

  queryCache.invalidateQueries({ key: ['billing', 'payment-methods'] })
  const paymentMethodId = outcome.session.savedPaymentMethods?.[0]?.id ?? null
  close({ added: true, paymentMethodId })
}
</script>

<template>
  <mobile-sheet
    data-testid="add-credit-card-modal"
    class="sm:max-w-130! max-h-[95dvh]"
    :title="t('settings.subscription.add-credit-card.title')"
    data-theme="green-400"
    @close="close()"
  >
    <div
      data-testid="add-credit-card-modal__body"
      class="overflow-y-auto max-h-[65dvh] px-6 pb-2 flex flex-col gap-4"
    >
      <p
        v-if="is_loading"
        data-testid="add-credit-card-modal__loading"
        class="text-brown-700 py-10 text-center"
      >
        {{ t('settings.subscription.add-credit-card.loading') }}
      </p>
      <p
        v-else-if="load_error"
        data-testid="add-credit-card-modal__error"
        class="py-10 text-center text-red-500"
      >
        {{ t('settings.subscription.add-credit-card.error') }}
      </p>
      <div ref="container" data-testid="add-credit-card-modal__payment-element"></div>
      <p
        v-if="submit_error"
        data-testid="add-credit-card-modal__submit-error"
        class="text-sm text-red-500"
      >
        {{ submit_error }}
      </p>
    </div>

    <div
      v-if="!is_loading && !load_error"
      data-testid="add-credit-card-modal__footer"
      class="px-6 pb-6 pt-2"
    >
      <ui-button
        data-testid="add-credit-card-modal__submit"
        data-theme="green-400"
        full-width
        size="lg"
        :loading="is_submitting"
        :disabled="!is_ready"
        @press="onSubmit"
      >
        {{ t('settings.subscription.add-credit-card.submit') }}
      </ui-button>
    </div>
  </mobile-sheet>
</template>
