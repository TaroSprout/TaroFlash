<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import PagedWindow, { type Page } from '@/components/layout-kit/paged-window/index.vue'
import type { WindowLayout } from '@/components/layout-kit/paged-window/layout'
import FeedbackPage from './feedback-page/index.vue'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()

// One page today; a permanent home so TARO-100 can add a sibling without a rewire.
const pages: Page[] = [{ value: 'feedback', icon: 'megaphone', label: t('admin.page.feedback') }]

// Always the (only) feedback page — no directory step to land on first.
const active_page = ref('feedback')

const pager = useTemplateRef<{ layout_mode: WindowLayout }>('pager')

const layout_mode = computed<WindowLayout>(() => pager.value?.layout_mode ?? 'phone')
</script>

<template>
  <paged-window
    ref="pager"
    data-testid="admin-container"
    data-palette="blue"
    :data-layout="layout_mode"
    :class="[
      layout_mode === 'desktop' ? 'w-268!' : 'w-full! max-w-240',
      layout_mode !== 'phone' && 'h-205'
    ]"
    :title="t('admin.header.title')"
    :pages="pages"
    scroll_body
    v-model:active="active_page"
    @close="close"
  >
    <template #default>
      <feedback-page />
    </template>
  </paged-window>
</template>
