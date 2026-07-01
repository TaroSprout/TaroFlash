<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'

type CheckoutFooterProps = {
  is_loading: boolean
  load_error: boolean
  is_success: boolean
  is_submitting: boolean
  is_ready: boolean
}

const { is_loading, load_error, is_success, is_submitting, is_ready } =
  defineProps<CheckoutFooterProps>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'done'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="!is_loading && !load_error" data-testid="checkout__footer" class="px-6 pb-6 pt-2">
    <ui-button
      v-if="!is_success"
      data-testid="checkout__submit"
      data-theme="green-400"
      full-width
      size="lg"
      :loading="is_submitting"
      :disabled="!is_ready"
      @press="emit('submit')"
    >
      {{ t('billing.checkout.submit') }}
    </ui-button>
    <ui-button
      v-else
      data-testid="checkout__success-close"
      data-theme="green-400"
      full-width
      size="lg"
      @press="emit('done')"
    >
      {{ t('billing.checkout.success-close') }}
    </ui-button>
  </div>
</template>
