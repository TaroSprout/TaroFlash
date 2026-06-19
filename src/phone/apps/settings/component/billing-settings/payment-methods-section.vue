<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import UiButton from '@/components/ui-kit/button.vue'
import AddCreditCardModal from './add-credit-card-modal.vue'
import type { AddCreditCardResponse } from './add-credit-card-modal.vue'
import {
  usePaymentMethodsQuery,
  useSetDefaultPaymentMethodMutation,
  useDetachPaymentMethodMutation
} from '@/api/billing'
import { useModal } from '@/composables/modal'
import { useToast } from '@/composables/toast'

const { t } = useI18n()
const modal = useModal()
const toast = useToast()

const methods_query = usePaymentMethodsQuery()
const set_default_mutation = useSetDefaultPaymentMethodMutation()
const detach_mutation = useDetachPaymentMethodMutation()

const payment_methods = computed(() => methods_query.data.value?.paymentMethods ?? [])
const default_id = computed(() => methods_query.data.value?.defaultPaymentMethodId ?? null)
const default_card = computed(
  () =>
    payment_methods.value.find((m) => m.id === default_id.value) ?? payment_methods.value[0] ?? null
)

function formatExpiry(month: number, year: number) {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
}

async function onChangeCard() {
  const old_ids = payment_methods.value.map((m) => m.id)
  const response = await modal.open<AddCreditCardResponse>(AddCreditCardModal, {
    mode: 'mobile-sheet',
    backdrop: true
  }).response

  if (!response?.added) return

  if (response.paymentMethodId) {
    try {
      await set_default_mutation.mutateAsync(response.paymentMethodId)
    } catch {
      toast.error(t('settings.subscription.payment-methods.set-default-error'))
      return
    }

    const stale_ids = old_ids.filter((id) => id !== response.paymentMethodId)
    for (const id of stale_ids) {
      try {
        await detach_mutation.mutateAsync(id)
      } catch {
        toast.error(t('settings.subscription.payment-methods.detach-error'))
      }
    }
  }
}
</script>

<template>
  <labeled-section
    data-testid="billing-settings__payment-methods"
    :label="t('settings.subscription.payment-methods.label')"
  >
    <p
      v-if="methods_query.isLoading.value"
      data-testid="billing-settings__payment-methods-loading"
      class="text-brown-500 dark:text-brown-400"
    >
      {{ t('settings.subscription.payment-methods.loading') }}
    </p>

    <div v-else class="flex items-center gap-4">
      <div
        v-if="default_card"
        data-testid="billing-settings__payment-method-card"
        class="flex-1 flex flex-col gap-1"
      >
        <p class="text-brown-700 dark:text-brown-200 capitalize">
          {{ default_card.card?.brand }} •••• {{ default_card.card?.last4 }}
        </p>
        <p v-if="default_card.card" class="text-sm text-brown-500 dark:text-brown-400">
          {{
            t('settings.subscription.payment-methods.expires', {
              expiry: formatExpiry(default_card.card.exp_month, default_card.card.exp_year)
            })
          }}
        </p>
      </div>
      <p
        v-else
        data-testid="billing-settings__payment-methods-empty"
        class="flex-1 text-brown-500 dark:text-brown-400"
      >
        {{ t('settings.subscription.payment-methods.no-card') }}
      </p>

      <ui-button
        data-testid="billing-settings__payment-methods-change"
        data-theme="brown-300"
        size="sm"
        @click="onChangeCard"
      >
        {{
          default_card
            ? t('settings.subscription.payment-methods.change')
            : t('settings.subscription.payment-methods.add')
        }}
      </ui-button>
    </div>
  </labeled-section>
</template>
