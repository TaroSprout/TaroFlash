<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useChangeCcClick } from './use-change-cc-click'
import { formatCardExpiry } from '@/utils/billing'

const { t } = useI18n()
const { methods_query, default_card, onChangeCardClick } = useChangeCcClick()
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
              expiry: formatCardExpiry(default_card.card.exp_month, default_card.card.exp_year)
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
        data-theme="brown-100"
        data-theme-dark="stone-700"
        size="sm"
        @press="onChangeCardClick"
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
