<script setup lang="ts">
import LoginForm from './form.vue'
import { useLoginActions } from '@/composables/auth/use-login-actions'
import { useRouter } from 'vue-router'

const { close } = defineProps<{ close?: () => void }>()

const router = useRouter()

const auth = useLoginActions()

async function onSubmit() {
  const result = await auth.submit()

  // 'invalid' shows inline field errors; 'error' shows the backend message
  // above the submit button — both keep the dialog open.
  if (result !== 'success') return

  router.push({ name: 'authenticated' })
  close?.()
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
  />
</template>
