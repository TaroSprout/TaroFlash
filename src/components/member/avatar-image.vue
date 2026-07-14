<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { loadAvatarUrl } from './avatars'
import avatarDefaultUrl from '@/assets/avatars/frog.svg'

type MemberAvatarImageProps = {
  avatar?: string
}

const { avatar } = defineProps<MemberAvatarImageProps>()

const lazyUrl = ref<string | null>(null)
const imageUrl = computed(() => lazyUrl.value ?? avatarDefaultUrl)

watch(
  () => avatar,
  async (key) => {
    lazyUrl.value = null
    const load = key ? loadAvatarUrl(key) : null
    lazyUrl.value = load ? await load : null
  },
  { immediate: true }
)
</script>

<template>
  <img :src="imageUrl" :alt="avatar ?? 'default'" />
</template>
