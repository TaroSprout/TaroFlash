<script setup lang="ts">
import UiInput from '@/components/ui-kit/input.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import type { AuthActions } from './use-auth-actions'

const { auth } = defineProps<{ auth: AuthActions }>()

const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
</script>

<template>
  <div data-testid="sign-up__form" class="w-full max-w-94.5 flex flex-col gap-8">
    <div data-testid="social-auth" class="flex flex-col gap-4.5">
      <ui-button
        size="xl"
        data-theme="brown-100"
        :fancy-hover="false"
        class="w-full!"
        icon-left="google-logo"
        @press="auth.submitOAuth('google')"
      >
        {{ t('signup-dialog.google-button') }}
      </ui-button>
      <!-- <ui-button size="lg" theme="brown" class="w-full!" @press="submitOAuth('apple')">
        {{ t('signup-dialog.apple') }}
      </ui-button> -->
    </div>

    <ui-divider :label="t('signup-dialog.divider-or')" />

    <form data-testid="email-auth" class="flex flex-col gap-4.5" @submit.prevent="emit('submit')">
      <ui-input
        size="lg"
        :placeholder="t('signup-dialog.form.username-placeholder')"
        v-model="auth.username"
        :error="auth.errors.username"
      />
      <ui-input
        size="lg"
        type="email"
        name="email"
        autocomplete="username"
        :placeholder="t('signup-dialog.form.email-placeholder')"
        v-model="auth.email"
        :error="auth.errors.email"
      />
      <ui-input
        size="lg"
        type="password"
        name="password"
        autocomplete="new-password"
        :placeholder="t('signup-dialog.form.password-placeholder')"
        v-model="auth.password"
        :error="auth.errors.password"
      />
      <ui-input
        size="lg"
        type="password"
        name="confirm-password"
        autocomplete="new-password"
        :placeholder="t('signup-dialog.form.confirm-password-placeholder')"
        v-model="auth.confirm_password"
        :error="auth.errors.confirm_password"
      />
      <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
    </form>
  </div>
</template>
