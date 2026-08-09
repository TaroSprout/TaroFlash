<script setup lang="ts">
import { type Component, shallowRef, watchEffect } from 'vue'
import logger from '@/utils/logger'

const { src } = defineProps<{
  src: string
}>()

/** Every icon, bundled eagerly. To make a subset lazy, list it explicitly and let the rest fall through to `lazyIcons` below. */
const eagerIcons: Record<string, Component> = import.meta.glob('../../assets/icons/*.svg', {
  eager: true,
  import: 'default'
})

const lazyIcons: Record<string, () => Promise<Component>> = import.meta.glob(
  '../../assets/icons/*.svg',
  {
    eager: false,
    import: 'default'
  }
)

const iconComponent = shallowRef<Component | undefined>()

watchEffect(async () => {
  const key = `../../assets/icons/${src}.svg`
  const eager = eagerIcons[key]

  if (eager) {
    iconComponent.value = eager
    return
  }

  const loader = lazyIcons[key]
  if (loader) {
    iconComponent.value = await loader()
    return
  }

  logger.warn(`Missing icon: ${src}`)
  iconComponent.value = undefined
})
</script>

<template>
  <component data-testid="ui-kit-icon" :is="iconComponent" :alt="src" />
</template>
