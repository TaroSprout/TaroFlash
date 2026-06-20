<script setup lang="ts">
import UiInput from '@/components/ui-kit/input.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useSessionStore } from '@/stores/session'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AuthError } from '@supabase/supabase-js'
import type { OAuthProvider } from '@/api/session'
import { emitSfx } from '@/sfx/bus'

type FieldName = 'username' | 'email' | 'password' | 'confirm_password'

const session = useSessionStore()
const { t } = useI18n()

const username = ref('')
const email = ref('')
const password = ref('')
const confirm_password = ref('')
const tried_submit = ref(false)
const loading = ref(false)

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

const clientErrors = computed(() => {
  const e: Partial<Record<FieldName, string>> = {}

  if (tried_submit.value && !username.value.trim())
    e.username = t('signup-dialog.form-validation.username-required')

  if (tried_submit.value && !email.value.trim())
    e.email = t('signup-dialog.form-validation.email-required')
  else if (tried_submit.value && !isEmail(email.value))
    e.email = t('signup-dialog.form-validation.email-invalid')

  if (tried_submit.value && !password.value)
    e.password = t('signup-dialog.form-validation.password-required')
  else if (tried_submit.value && password.value.length < 8)
    e.password = t('signup-dialog.form-validation.password-too-short')

  if (tried_submit.value && !confirm_password.value)
    e.confirm_password = t('signup-dialog.form-validation.confirm-password-required')
  else if (tried_submit.value && confirm_password.value !== password.value)
    e.confirm_password = t('signup-dialog.form-validation.confirm-password-mismatch')

  return e
})

const serverErrors = ref<Partial<Record<FieldName, string>>>({})

const errors = computed(() => ({
  ...serverErrors.value,
  ...clientErrors.value // client wins if both exist
}))

const isValid = computed(() => Object.keys(errors.value).length === 0)

async function submit() {
  try {
    tried_submit.value = true

    if (!isValid.value) {
      throw new Error('Invalid form')
    }

    loading.value = true
    await session.signupEmail(email.value.trim(), password.value, {
      display_name: username.value.trim()
    })

    return true
  } catch (e: any) {
    const authError = e as AuthError

    if (authError.code === 'user_already_exists') {
      emitSfx('etc_woodblock_stuck')
      serverErrors.value.email = t('signup-dialog.form-validation.email-already-in-use')
    }

    if (e.message === 'Invalid form') {
      emitSfx('etc_woodblock_stuck')
    }

    return false
  } finally {
    loading.value = false
  }
}

async function submitOAuth(provider: OAuthProvider) {
  await session.signInOAuth(provider, { redirectTo: '/dashboard' })
}

defineExpose({ submit, isValid, loading })
</script>

<template>
  <div data-testid="sign-up__form" class="w-94.5 flex flex-col gap-8">
    <div data-testid="social-auth" class="flex flex-col gap-4.5">
      <ui-button
        size="xl"
        data-theme="brown-100"
        :fancy-hover="false"
        class="w-full!"
        icon-left="google-logo"
        @press="submitOAuth('google')"
      >
        {{ t('signup-dialog.google-button') }}
      </ui-button>
      <!-- <ui-button size="lg" theme="brown" class="w-full!" @press="submitOAuth('apple')">
        {{ t('signup-dialog.apple') }}
      </ui-button> -->
    </div>

    <ui-divider :label="t('signup-dialog.divider-or')" />

    <form data-testid="email-auth" class="flex flex-col gap-4.5">
      <ui-input
        size="lg"
        :placeholder="t('signup-dialog.form.username-placeholder')"
        v-model="username"
        :error="errors.username"
      />
      <ui-input
        size="lg"
        type="email"
        name="email"
        autocomplete="username"
        :placeholder="t('signup-dialog.form.email-placeholder')"
        v-model="email"
        :error="errors.email"
      />
      <ui-input
        size="lg"
        type="password"
        name="password"
        autocomplete="new-password"
        :placeholder="t('signup-dialog.form.password-placeholder')"
        v-model="password"
        :error="errors.password"
      />
      <ui-input
        size="lg"
        type="password"
        name="confirm-password"
        autocomplete="new-password"
        :placeholder="t('signup-dialog.form.confirm-password-placeholder')"
        v-model="confirm_password"
        :error="errors.confirm_password"
      />
    </form>
  </div>
</template>
