<script setup lang="ts">
import LoginForm from './form.vue'
import { useLoginActions } from '@/composables/auth/use-login-actions'
import { useForgotPasswordModal } from '../forgot-password/forgot-password-modal'
import { useSessionStore } from '@/stores/session'

const { close } = defineProps<{ close?: () => void }>()

const session = useSessionStore()
const forgotPasswordModal = useForgotPasswordModal()

const auth = useLoginActions()

async function onSubmit() {
  const result = await auth.submit()

  // 'invalid' shows inline field errors; 'error' shows the backend message
  // above the submit button — both keep the dialog open.
  if (result !== 'success') return

  session.onAuthenticated()
}

function onForgotPassword() {
  close?.()
  forgotPasswordModal.open()
}
</script>

<template>
  <login-form
    v-model:email="auth.email"
    v-model:password="auth.password"
    :errors="auth.errors"
    :loading="auth.loading"
    :all-filled="auth.all_filled"
    :submit-error="auth.submitError"
    @submit="onSubmit"
    @oauth="auth.submitOAuth"
    @forgot-password="onForgotPassword"
  />
</template>
