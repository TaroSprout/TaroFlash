<script setup lang="ts">
import LoginForm from './form.vue'
import UiDropdownButton from '@/components/ui-kit/dropdown-button/index.vue'
import { useLoginActions } from '@/composables/auth/use-login-actions'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const auth = useLoginActions()

async function onSubmit() {
  const result = await auth.submit()

  // 'invalid' shows inline field errors; 'error' shows the backend message
  // above the submit button — both keep the dialog open.
  if (result === 'success') router.push({ name: 'authenticated' })
}
</script>

<template>
  <ui-dropdown-button
    size="lg"
    data-theme="brown-200"
    data-theme-dark="stone-700"
    menu-theme="brown-200"
    variant="ghost"
    shadow
    position="bottom-end"
    icon-left="user-sticker-square"
    open-on-trigger
    hide-trigger
    data-testid="login__trigger"
  >
    {{ t('welcome-view.login-button') }}

    <template #panel>
      <login-form
        v-model:email="auth.email"
        v-model:password="auth.password"
        :errors="auth.errors"
        :loading="auth.loading"
        :all-filled="auth.all_filled"
        :submit-error="auth.submitError"
        @vue:mounted="auth.reset"
        @submit="onSubmit"
        @oauth="auth.submitOAuth"
      />
    </template>
  </ui-dropdown-button>
</template>
