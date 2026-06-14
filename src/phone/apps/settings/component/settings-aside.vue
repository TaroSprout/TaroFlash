<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { inject } from 'vue'
import { memberEditorKey } from '@/composables/member/editor'

const { t, locale } = useI18n()
const editor = inject(memberEditorKey)!

const joined_on = computed(() => {
  const raw = editor.created_at.value
  if (!raw) return t('settings.preview.title-fallback')
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return t('settings.preview.title-fallback')
  return new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(d)
})
</script>

<template>
  <aside
    data-testid="settings-aside"
    class="h-full flex flex-col justify-between gap-5 text-brown-700 dark:text-brown-100"
  >
    <h2
      data-testid="settings-aside__title"
      class="text-center text-3xl font-semibold leading-tight truncate"
    >
      {{ editor.settings.display_name || t('settings.preview.title-fallback') }}
    </h2>

    <div
      data-testid="settings-aside__meta"
      class="flex items-center justify-center gap-2 text-sm text-brown-500 dark:text-brown-300"
    >
      <span data-testid="settings-aside__plan">{{ editor.plan.value }}</span>
      <span aria-hidden="true">·</span>
      <span data-testid="settings-aside__joined-on">{{ joined_on }}</span>
    </div>
  </aside>
</template>
