<script setup lang="ts">
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { nextDepth, provideDepth, useAmbientDepth } from '@/composables/ui/depth'

const emit = defineEmits<{
  (e: 'open'): void
}>()

const store = useTaroPhoneStore()

// Same raised surface as the full phone — this is just its collapsed form. The
// screen and the home dot sit one step further up again.
const ambient_depth = useAmbientDepth()
const depth = provideDepth(() => nextDepth(ambient_depth.value))
</script>

<template>
  <div
    @click="emit('open')"
    data-testid="phone"
    :data-depth="depth"
    class="absolute top-0 right-0 w-16.25 h-22 bg-surface rounded-4.5 shadow-xs rotate-6 cursor-pointer p-2 pb-1 mt-3 flex flex-col gap-1 items-center scale-75 pointer-events-auto"
  >
    <div
      v-if="store.notification_count > 0"
      data-testid="notification-badge"
      class="absolute top-0 left-0 w-4 h-4 bg-red-500 outline-4 outline-surface rounded-full"
    ></div>

    <div data-depth="2" class="w-full h-full bg-surface rounded-2.5"></div>
    <div data-depth="2" class="w-2.75 h-2.75 rounded-full outline-1 outline-surface shrink-0"></div>
  </div>
</template>
