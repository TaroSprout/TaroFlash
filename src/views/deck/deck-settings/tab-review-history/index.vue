<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionList from '@/components/layout-kit/section-list.vue'

const { t } = useI18n()
</script>

<template>
  <section-list
    data-testid="tab-review-history"
    class="px-(--deck-settings-padding) pb-(--deck-settings-padding)"
  >
    <div
      data-testid="tab-review-history__placeholder"
      class="flex min-h-120 items-center justify-center text-lg text-brown-400"
    >
      {{ t('deck.settings-modal.review-history.coming-soon') }}
    </div>
  </section-list>
</template>
