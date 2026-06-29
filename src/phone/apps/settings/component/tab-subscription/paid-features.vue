<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PLANS } from '@/config/plans'

const { t } = useI18n()

const upgrade_features = PLANS.paid.features.filter((f) => f.upgradeHighlight)

const price = `$${PLANS.paid.monthlyPriceUsd} / mo`
</script>

<template>
  <div
    data-testid="paid-features"
    data-theme="brown-100"
    class="flex flex-col gap-3 rounded-4 px-5 py-4 text-(--theme-on-primary) bg-(--theme-primary) bgx-leaf bgx-size-23 bgx-opacity-3 bgx-color-brown-700"
  >
    <div data-testid="paid-features__header" class="flex items-center justify-between gap-4">
      <p data-testid="paid-features__heading" class="text-2xl">
        {{ t('settings.subscription.free.features.heading') }}
      </p>

      <p data-testid="paid-features__price">{{ price }}</p>
    </div>

    <ul data-testid="paid-features__list" class="flex flex-col gap-2">
      <li
        v-for="feature in upgrade_features"
        :key="feature.key"
        data-testid="paid-features__item"
        class="text-base text-brown-500"
      >
        {{ t(`plans.paid.features.${feature.key}`) }}
      </li>
    </ul>
  </div>
</template>
