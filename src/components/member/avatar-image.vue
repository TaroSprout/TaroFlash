<script setup lang="ts">
import { ref, watch } from 'vue'
import { loadAvatarUrl } from './avatars'
import avatarDefaultUrl from '@/assets/avatars/frog.svg?url'

type MemberAvatarImageProps = {
  avatar?: string
}

const { avatar } = defineProps<MemberAvatarImageProps>()

const lazyUrl = ref<string | null>(null)
const loaded = ref(false)

watch(
  () => avatar,
  async (key) => {
    lazyUrl.value = null
    loaded.value = false
    const load = key ? loadAvatarUrl(key) : null
    lazyUrl.value = load ? await load : null
  },
  { immediate: true }
)
</script>

<template>
  <div
    v-if="avatar && !lazyUrl"
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
