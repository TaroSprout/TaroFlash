<script setup lang="ts">
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-kit/button.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { computed } from 'vue'

defineSlots<{ default?(): unknown }>()

const router = useRouter()

const is_mobile = useMatchMedia('w<sm')

const visible = computed(() => router.currentRoute.value.name !== 'dashboard')
</script>

<template>
  <ui-button
    v-if="visible"
    data-theme="brown-100"
    icon-left="arrow-left"
    :size="is_mobile ? 'base' : 'sm'"
    icon-only
    :sfx="{ tap_pre: 'snappy_button_5', press: 'slide_left' }"
    @press="router.go(-1)"
  >
  </ui-button>
</template>
