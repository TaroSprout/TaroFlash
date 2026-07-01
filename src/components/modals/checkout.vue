<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useCreateSubscriptionMutation } from '@/api/billing'
import { useCheckoutElements } from '@/composables/billing/use-checkout-elements'
import { emitSfx } from '@/sfx/bus'

export type CheckoutResponse = { upgraded: boolean }

const { close } = defineProps<{
  close: (response?: CheckoutResponse) => void
}>()

const { t } = useI18n()
const queryCache = useQueryCache()
const { mutateAsync: createSubscription } = useCreateSubscriptionMutation()

const is_success = ref(false)

const { container_ref, is_loading, is_submitting, is_ready, load_error, submit_error, confirm } =
  useCheckoutElements({
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    genericErrorMessage: t('billing.checkout.submit-error'),
    getClientSecret: async () => {
      const { clientSecret } = await createSubscription({
        planId: 'paid',
        returnUrl: window.location.origin
      })
      return clientSecret
    }
  })

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))

async function onSubmit() {
  const outcome = await confirm()
  if (outcome.status !== 'success') return

  queryCache.invalidateQueries({ key: ['member'] })
  is_success.value = true
}

function onDone() {
  close({ upgraded: true })
}
</script>

<template>
  <mobile-sheet
    data-testid="checkout"
    class="sm:max-w-130! max-h-[95dvh]"
    :title="t('billing.checkout.title')"
    data-theme="green-400"
    @close="close()"
  >
    <crossfade-resize data-testid="checkout__body-swap">
      <div
        v-if="!is_success"
        key="form"
        data-testid="checkout__body"
        class="overflow-y-auto max-h-[65dvh] px-6 pb-2 flex flex-col gap-4"
      >
        <p
          v-if="is_loading"
          data-testid="checkout__loading"
          class="text-brown-700 py-10 text-center"
        >
          {{ t('billing.checkout.loading') }}
        </p>
        <p
          v-else-if="load_error"
          data-testid="checkout__error"
          class="py-10 text-center text-red-500"
        >
          {{ t('billing.checkout.error') }}
        </p>
        <div ref="container" data-testid="checkout__payment-element"></div>
        <p v-if="submit_error" data-testid="checkout__submit-error" class="text-sm text-red-500">
          {{ submit_error }}
        </p>
      </div>

      <div
        v-else
        key="success"
        data-testid="checkout__success"
        class="flex flex-col items-center gap-3 px-6 py-10 text-center"
      >
        <ui-icon src="check" class="w-12 h-12 text-(--theme-primary)" />
        <h2 data-testid="checkout__success-heading" class="text-2xl text-brown-700">
          {{ t('billing.checkout.success-heading') }}
        </h2>
        <p data-testid="checkout__success-message" class="text-brown-500">
          {{ t('billing.checkout.success-message') }}
        </p>
      </div>
    </crossfade-resize>

    <template #footer>
      <div v-if="!is_loading && !load_error" data-testid="checkout__footer" class="px-6 pb-6 pt-2">
        <ui-button
          v-if="!is_success"
          data-testid="checkout__submit"
          data-theme="green-400"
          full-width
          size="lg"
          :loading="is_submitting"
          :disabled="!is_ready"
          @press="onSubmit"
        >
          {{ t('billing.checkout.submit') }}
        </ui-button>
        <ui-button
          v-else
          data-testid="checkout__success-close"
          data-theme="green-400"
          full-width
          size="lg"
          @press="onDone"
        >
          {{ t('billing.checkout.success-close') }}
        </ui-button>
      </div>
    </template>
  </mobile-sheet>
</template>
