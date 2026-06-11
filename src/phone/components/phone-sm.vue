<script setup lang="ts">
type PhoneSmProps = {
  notification_count: number
}

const { notification_count } = defineProps<PhoneSmProps>()

const emit = defineEmits<{
  (e: 'open'): void
}>()
</script>

<template>
  <div
    @click="emit('open')"
    data-testid="phone"
    class="absolute top-0 right-0 w-16.25 h-22 bg-brown-300 rounded-4.5 shadow-xs rotate-6 cursor-pointer p-2 pb-1 mt-3 flex flex-col gap-1 items-center scale-75 pointer-events-auto"
  >
    <div
      v-if="notification_count > 0"
      data-testid="notification-badge"
      class="absolute top-0 left-0 w-4 h-4 bg-red-500 outline-4 outline-brown-300 rounded-full"
    ></div>
    <div class="w-full h-full bg-[#B8B1A9] rounded-2.5"></div>
    <div class="w-2.75 h-2.75 rounded-full outline-1 outline-[#B8B1A9] shrink-0"></div>
  </div>
</template>
