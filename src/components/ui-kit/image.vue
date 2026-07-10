<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import logger from '@/utils/logger'

const { src, size = 'unset' } = defineProps<{
  src: string
  size?: 'full' | 'xl' | 'lg' | 'base' | 'sm' | 'xs' | 'unset'
}>()

// Images listed in the eager globs are bundled into the main chunk.
// All others are code-split and fetched on first use.
const eagerImages: Record<string, string> = {
  ...import.meta.glob(
    [
      '../../assets/images/shortcuts.svg',
      '../../assets/images/shortcuts-hover.svg',
      '../../assets/images/inventory.svg',
      '../../assets/images/inventory-hover.svg',
      '../../assets/images/logout.svg',
      '../../assets/images/logout-hover.svg',
      '../../assets/images/settings.svg',
      '../../assets/images/settings-hover.svg',
      '../../assets/images/feedback.svg',
      '../../assets/images/feedback-hover.svg',
      '../../assets/images/darkmode-system.svg',
      '../../assets/images/darkmode-light.svg',
      '../../assets/images/darkmode-dark.svg'
    ],
    { eager: true, query: '?url', import: 'default' }
  )
}

const lazyRaster = import.meta.glob('../../assets/images/*.{png,jpg,jpeg}', {
  import: 'default'
})

const lazySvgs = import.meta.glob('../../assets/images/*.svg', {
  query: '?url',
  import: 'default'
})

const lazyModules = { ...lazyRaster, ...lazySvgs }
const lazyUrl = ref<string | null>(null)

const eagerUrl = computed(() => {
  const key = findKey(eagerImages, src)
  return key ? (eagerImages[key] as string) : null
})
const imageUrl = computed(() => eagerUrl.value ?? lazyUrl.value)

function findKey(mods: Record<string, any>, name: string) {
  const re = new RegExp(`/${name}\\.(png|jpe?g|svg)$`, 'i')
  return Object.keys(mods).find((k) => re.test(k))
}

watch(
  () => src,
  async (name) => {
    lazyUrl.value = null
    if (eagerUrl.value) return

    const lazyKey = findKey(lazyModules, name)
    if (!lazyKey) {
      logger.warn(`No image found for: ${name}`)
      return
    }

    lazyUrl.value = (await lazyModules[lazyKey]()) as string
  },
  { immediate: true }
)
</script>

<template>
  <img v-if="imageUrl" :src="imageUrl" :alt="src" :class="`ui-kit-image--${size}`" />
</template>

<style>
.ui-kit-image--full {
  height: 100%;
  width: 100%;
}

.ui-kit-image--xl {
  height: 128px;
  width: 128px;
}

.ui-kit-image--lg {
  height: 96px;
  width: 96px;
}

.ui-kit-image--base {
  height: 64px;
  width: 64px;
}

.ui-kit-image--sm {
  height: 48px;
  width: 48px;
}

.ui-kit-image--xs {
  height: 32px;
  width: 32px;
}

.ui-kit-image--2xs {
  height: 16px;
  width: 16px;
}
</style>
