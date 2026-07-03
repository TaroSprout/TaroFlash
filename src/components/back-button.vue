<script setup lang="ts">
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-kit/button.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { computed } from 'vue'

const router = useRouter()

const is_mobile = useMatchMedia('w<sm')

const visible = computed(() => router.currentRoute.value.name !== 'dashboard')

// A fresh page load (direct URL, refresh) has no router-tracked entry to go
// back to — the router's history.state.back is null in that case — so
// `router.go(-1)` would just re-land on this same route instead of actually
// navigating back.
function onBack() {
  if (router.options.history.state.back) router.go(-1)
  else router.push({ name: 'dashboard' })
}
</script>

<template>
  <ui-button
    v-if="visible"
    data-theme="brown-100"
    icon-left="arrow-left"
    :size="is_mobile ? 'base' : 'sm'"
    icon-only
    :sfx="{ tap_pre: 'snappy_button_5', press: 'slide_left' }"
    @press="onBack"
  >
  </ui-button>
</template>
