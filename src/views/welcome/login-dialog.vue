<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import { useSessionStore } from '@/stores/session'
import type { OAuthProvider } from '@/api/session'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/toast'

const router = useRouter()
const toast = useToast()

const { t } = useI18n()
const session = useSessionStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

function submitOAuth(provider: OAuthProvider) {
  session.signInOAuth(provider)
}

async function onSubmit(): Promise<void> {
  try {
    loading.value = true

    await session.login(email.value, password.value)
    router.push({ name: 'authenticated' })
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div data-testid="login-dialog" class="w-80 flex flex-col items-center gap-6 p-4">
    <ui-button
      data-testid="login-dialog__google"
      data-theme="brown-100"
      data-theme-dark="stone-900"
      size="lg"
      :fancy-hover="false"
      class="w-full!"
      icon-left="google-logo"
      @press="submitOAuth('google')"
    >
      {{ t('login-dialog.google-button') }}
    </ui-button>

    <ui-divider :label="t('login-dialog.divider-or')" />

    <form class="w-full flex flex-col items-center gap-6" @submit.prevent="onSubmit">
      <div class="flex flex-col gap-4 w-full">
        <div data-testid="login-dialog__email">
          <ui-input
            type="email"
            name="email"
            autocomplete="username"
            size="lg"
            v-model="email"
            :placeholder="t('login-dialog.email-placeholder')"
          />
        </div>

        <div data-testid="login-dialog__password">
          <ui-input
            type="password"
            name="password"
            autocomplete="current-password"
            size="lg"
            v-model="password"
            :placeholder="t('login-dialog.password')"
          />
        </div>
      </div>

      <ui-button
        data-testid="login-dialog__submit"
        size="lg"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        :loading="loading"
        class="w-full!"
        @press="onSubmit"
      >
        {{ t('login-dialog.submit-button') }}
      </ui-button>
    </form>
  </div>
</template>
