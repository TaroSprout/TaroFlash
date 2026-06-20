<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import SignupForm from './form.vue'
import { useI18n } from 'vue-i18n'
import { useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAlert } from '@/composables/alert'

const { close } = defineProps<{
  close: (response?: boolean) => void
}>()

const { t } = useI18n()
const router = useRouter()
const alert = useAlert()

const form = useTemplateRef('form')

async function onSubmit() {
  const success = (await form.value?.submit()) ?? false

  if (success) {
    router.push('/dashboard')
  } else {
    alert.warn({
      title: t('signup-dialog.alert.error-title'),
      message: t('signup-dialog.alert.error-message'),
      cancelLabel: t('signup-dialog.alert.close')
    })
  }

  close(true)
}
</script>

<template>
  <div
    data-testid="signup-container"
    class="bg-brown-300 dark:bg-grey-800 rounded-10 shadow-lg overflow-hidden"
  >
    <div
      data-testid="signup__header"
      class="px-8 py-10 bg-blue-500 dark:bg-blue-650 bgx-leaf bgx-fill-brown-100 dark:bgx-fill-brown-300 bgx-opacity-10 bgx-size-25 bg-size-[10%] wave-bottom-[30px] flex items-center justify-center"
    >
      <h1 class="text-5xl text-brown-100">{{ t('signup-dialog.heading') }}</h1>
    </div>

    <div data-testid="signup__body" class="flex flex-col gap-8 py-8 px-15 items-center relative">
      <signup-form ref="form" />

      <div data-testid="actions" class="w-full flex justify-center gap-2.5 col-start-2">
        <ui-button size="lg" data-theme="brown-100" :fancy-hover="false" @press="close()">{{
          t('signup-dialog.cancel')
        }}</ui-button>
        <ui-button size="lg" data-theme="blue-500" :loading="form?.loading" @press="onSubmit">{{
          t('signup-dialog.submit-button')
        }}</ui-button>
      </div>
    </div>
  </div>
</template>

<style>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.5s ease;
}

.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
