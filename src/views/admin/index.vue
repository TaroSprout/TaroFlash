<script setup lang="ts">
import { computed, provide, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import PagedWindow, { type Page } from '@/components/layout-kit/paged-window/index.vue'
import type { WindowLayout } from '@/components/layout-kit/paged-window/layout'
import PalettePage from './color-page/palette-page.vue'
import RolesPage from './color-page/roles-page.vue'
import { colorTunerKey, useColorTuner } from './color-page/use-color-tuner'
import FeedbackPage from './feedback-page/index.vue'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()

const pages: Page[] = [
  { value: 'feedback', icon: 'megaphone', label: t('admin.page.feedback') },
  { value: 'palette', icon: 'paint-brush', label: t('admin.page.palette') },
  { value: 'roles', icon: 'design-services', label: t('admin.page.roles') }
]

// The tuner lives above the pages that read it, so switching between palette and roles keeps one
// undo history rather than two.
provide(colorTunerKey, useColorTuner())

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
    <template #default="{ displayed_page }">
      <palette-page v-if="displayed_page === 'palette'" />
      <roles-page v-else-if="displayed_page === 'roles'" />
      <feedback-page v-else />
    </template>
  </paged-window>
</template>
