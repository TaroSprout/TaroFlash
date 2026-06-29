<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PLANS } from '@/config/plans'
import { useSubscriptionActions } from '@/composables/member/subscription-actions'
import UiTappable from '@/components/ui-kit/tappable.vue'
import UiButton from '@/components/ui-kit/button.vue'

const { t } = useI18n()
const { onUpgrade } = useSubscriptionActions()

const upgrade_features = PLANS.paid.features.filter((f) => f.upgradeHighlight)

const price = `$${PLANS.paid.monthlyPriceUsd} / mo`
</script>

<template>
  <div data-testid="paid-features" class="relative">
    <ui-tappable
      data-testid="paid-features__body"
      data-theme="brown-100"
      class="card-outline w-full flex flex-col gap-3 rounded-4 px-5 py-4 text-(--theme-on-primary) bg-(--theme-primary) bgx-leaf bgx-size-23 bgx-opacity-3 bgx-color-brown-700 pointer-fine:hover:scale-101 data-[active=true]:scale-101 pointer-coarse:data-[active=true]:scale-105 pointer-fine:transition-transform duration-75 cursor-pointer touch-manipulation"
      @tap="onUpgrade"
    >
      <div data-testid="paid-features__upgrade" class="absolute -bottom-2 -right-2 z-10 rotate-2">
        <ui-button data-theme="yellow-500" icon-left="triangle-eye">
          {{ t('settings.subscription.free.upgrade') }}
        </ui-button>
      </div>

      <div data-testid="paid-features__header" class="flex items-center justify-between gap-4">
        <p data-testid="paid-features__heading" class="text-2xl">
          {{ t('settings.subscription.free.features.heading') }}
        </p>

        <p data-testid="paid-features__price">{{ price }}</p>
      </div>

      <ul data-testid="paid-features__list" class="flex flex-col gap-2 text-start">
        <li
          v-for="feature in upgrade_features"
          :key="feature.key"
          data-testid="paid-features__item"
          class="text-base text-brown-500"
        >
          {{ t(`plans.paid.features.${feature.key}`) }}
        </li>
      </ul>
    </ui-tappable>
  </div>
</template>
