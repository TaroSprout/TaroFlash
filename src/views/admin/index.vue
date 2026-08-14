<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PagedWindow, { type Page } from '@/components/layout-kit/paged-window/index.vue'
import FeedbackPage from './feedback-page/index.vue'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()

// One page today; a permanent home so TARO-100 can add a sibling without a rewire.
const pages: Page[] = [{ value: 'feedback', icon: 'megaphone', label: t('admin.page.feedback') }]

// Always the (only) feedback page — no directory step to land on first.
const active_page = ref('feedback')
</script>

<template>
  <paged-window
    data-testid="admin-container"
    data-palette="purple"
    :title="t('admin.header.title')"
    :pages="pages"
    v-model:active="active_page"
    @close="close"
  >
    <template #default>
      <feedback-page />
    </template>
  </paged-window>
</template>
