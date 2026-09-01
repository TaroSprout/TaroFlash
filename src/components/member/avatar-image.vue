<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { loadAvatarUrl } from './avatars'
import avatarDefaultUrl from '@/assets/avatars/frog.svg?url'

type MemberAvatarImageProps = {
  avatar?: string
}

const { avatar } = defineProps<MemberAvatarImageProps>()

// `undefined` marks a key still resolving; `null` marks either no key or a
// key that resolved to nothing — both fall back to the frog.
const lazyUrl = ref<string | null | undefined>(undefined)
// Tracks the real avatar's own paint, not just its URL resolution — the
// placeholder has to survive the gap between "url known" and "image
// painted", or a set-but-slow avatar shows a blank frame.
const loaded = ref(false)
const imgEl = ref<HTMLImageElement>()

watch(
  () => avatar,
  async (key) => {
    lazyUrl.value = key ? undefined : null
    loaded.value = false
    const load = key ? await loadAvatarUrl(key) : null

    if (key !== avatar) return // a newer key resolved first; this result is stale

    lazyUrl.value = load
    await nextTick()
    // A cached image can load before @load attaches, stranding the placeholder.
    if (imgEl.value?.complete) loaded.value = true
  },
  { immediate: true }
)
</script>

<template>
  <div class="relative h-full w-full">
    <div
      v-if="avatar && (lazyUrl === undefined || (typeof lazyUrl === 'string' && !loaded))"
      data-testid="avatar-image__placeholder"
      class="bg-skeleton bgx-diagonal-stripes shimmer absolute inset-0 h-full w-full"
    />
    <img
      v-if="lazyUrl !== undefined"
      ref="imgEl"
      :src="lazyUrl ?? avatarDefaultUrl"
      :alt="avatar ?? 'default'"
      class="h-full w-full transition-opacity duration-300"
      :class="!lazyUrl || loaded ? 'opacity-100' : 'opacity-0'"
      @load="loaded = true"
      @error="loaded = true"
    />
  </div>
</template>
