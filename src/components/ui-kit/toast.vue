<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { type Toast } from '@/composables/toast'

type ToastProps = {
  toast: Toast
}

const props = defineProps<ToastProps>()

const emit = defineEmits<{
  (e: 'close', toast: Toast): void
}>()

const open = ref(false)
const timeout = ref<number>()

const color = computed(() => {
  switch (props.toast.state) {
    case 'info':
      return 'bg-blue-500'
    case 'warn':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-blue-500'
  }
})

onMounted(() => {
  openToast()
})

function openToast(): void {
  open.value = true
  if (props.toast.persist) return

  timeout.value = window.setTimeout(() => {
    closeToast()
  }, props.toast.delay)
}

function closeToast(): void {
  open.value = false

  setTimeout(() => {
    emit('close', props.toast)
  }, 1000) // Animation time
}
</script>

<template>
  <transition
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    enter-active-class="transition-transform transform"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
    leave-active-class="transition-transform transform"
  >
    <div ui-kit-toast v-if="open" class="rounded-8 w-72 p-4 text-white shadow-lg" :class="color">
      {{ toast.message }}
    </div>
  </transition>
</template>
