<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { useModal } from '@/composables/modal'
import Checkout from '@/components/modals/checkout.vue'

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
    <div class="flex flex-col gap-3">
      <h2 class="text-brown-700 dark:text-brown-300 text-lg">
        {{ t('settings.subscription.free.status') }}
      </h2>
      <div>
        <ui-button
          data-testid="tab-subscription__upgrade"
          data-theme="green-400"
          size="sm"
          icon-left="moon-stars"
          @press="openUpgradeModal"
        >
          {{ t('settings.subscription.free.upgrade') }}
        </ui-button>
      </div>
    </div>
  </labeled-section>
</template>
