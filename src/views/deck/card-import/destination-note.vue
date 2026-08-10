<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <p data-testid="card-import-destination" class="text-center text-sm text-ink-muted">
    {{ t('deck-view.card-import.destination') }}
  </p>
</template>
