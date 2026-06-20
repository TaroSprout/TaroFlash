<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import PlanPill from './plan-pill.vue'
import { useModal } from '@/composables/modal'
import Checkout from '@/components/modals/checkout.vue'
import { PLANS } from '@/config/plans'

const { t } = useI18n()
const modal = useModal()

function openUpgradeModal() {
  modal.open(Checkout, { mode: 'mobile-sheet', backdrop: true })
}
</script>

<template>
  <labeled-section
    data-testid="tab-subscription__free"
    :label="t('settings.subscription.free.label')"
  >
    <plan-pill
      data-theme="green-400"
      data-theme-dark="green-400"
      :name="PLANS.free.displayName"
      :cost="t('settings.subscription.free.cost')"
      :description="t('settings.subscription.free.status')"
    >
      <template #actions>
        <ui-button
          data-testid="tab-subscription__upgrade"
          data-theme="yellow-500"
          size="sm"
          icon-left="moon-stars"
          @press="openUpgradeModal"
        >
          {{ t('settings.subscription.free.upgrade') }}
        </ui-button>
      </template>
    </plan-pill>
  </labeled-section>
</template>
