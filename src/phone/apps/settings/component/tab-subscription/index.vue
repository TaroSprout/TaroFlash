<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import PlanSection from '../billing-settings/plan-section.vue'
import PaymentMethodsSection from '../billing-settings/payment-methods-section.vue'
import InvoicesSection from '../billing-settings/invoices-section.vue'
import SettingsBackButton from '../settings-back-button.vue'
import { useMemberStore } from '@/stores/member'
import { useSubscriptionQuery } from '@/api/billing'
import { useModal } from '@/composables/modal'
import Checkout from '@/components/modals/checkout.vue'

const { t } = useI18n()
const member_store = useMemberStore()
const modal = useModal()
const subscription_query = useSubscriptionQuery()

const emit = defineEmits<{ back: [] }>()

function openUpgradeModal() {
  modal.open(Checkout, { mode: 'mobile-sheet', backdrop: true })
}
</script>

<template>
  <section-list data-testid="tab-subscription" class="max-h-full overflow-y-auto">
    <settings-back-button @back="emit('back')" />

    <labeled-section
      v-if="member_store.plan !== 'paid'"
      data-testid="tab-subscription__free"
      :label="t('settings.subscription.free.label')"
    >
      <div class="grid grid-cols-[200px_1fr] gap-6 items-start">
        <h2 class="text-brown-700 dark:text-brown-300 text-lg">
          {{ t('settings.subscription.free.status') }}
        </h2>
        <div>
          <ui-button
            data-testid="tab-subscription__upgrade"
            data-theme="green-400"
            size="sm"
            icon-left="moon-stars"
            @click="openUpgradeModal"
          >
            {{ t('settings.subscription.free.upgrade') }}
          </ui-button>
        </div>
      </div>
    </labeled-section>

    <template v-else>
      <p
        v-if="subscription_query.isLoading.value"
        data-testid="tab-subscription__loading"
        class="text-brown-600 dark:text-brown-300 text-center py-8"
      >
        {{ t('settings.subscription.section-loading') }}
      </p>

      <p
        v-else-if="subscription_query.error.value"
        data-testid="tab-subscription__error"
        class="text-red-500 text-center py-8"
      >
        {{ t('settings.subscription.error') }}
      </p>

      <template v-else>
        <plan-section :subscription-query="subscription_query" />
        <payment-methods-section />
        <invoices-section />
      </template>
    </template>
  </section-list>
</template>
