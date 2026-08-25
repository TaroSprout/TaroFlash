<script setup lang="ts">
import { ref, watch } from 'vue'
import { loadAvatarUrl } from './avatars'
import avatarDefaultUrl from '@/assets/avatars/frog.svg?url'

type MemberAvatarImageProps = {
  avatar?: string
}

const { avatar } = defineProps<MemberAvatarImageProps>()

// `undefined` marks a key still resolving; `null` marks either no key or a
// key that resolved to nothing — both fall back to the frog.
const lazyUrl = ref<string | null | undefined>(undefined)
const loaded = ref(false)

watch(
  () => avatar,
  async (key) => {
    lazyUrl.value = key ? undefined : null
    loaded.value = false
    const load = key ? await loadAvatarUrl(key) : null

    if (key !== avatar) return // a newer key resolved first; this result is stale

    lazyUrl.value = load
  },
  { immediate: true }
)
</script>

<template>
  <div
    v-if="avatar && lazyUrl === undefined"
    data-testid="avatar-image__placeholder"
    class="h-full w-full bg-skeleton bgx-diagonal-stripes shimmer"
  />
  <img
    v-else
    :src="lazyUrl ?? avatarDefaultUrl"
    :alt="avatar ?? 'default'"
    class="h-full w-full transition-opacity duration-300"
    :class="!lazyUrl || loaded ? 'opacity-100' : 'opacity-0'"
    @load="loaded = true"
  />
</template>
