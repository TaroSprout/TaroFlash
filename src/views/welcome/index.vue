<script setup lang="ts">
import { useSessionStore } from '@/stores/session'
import { onMounted, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { useSignupModal } from './signup/signup-modal'
import { useResetPasswordModal } from './reset-password/reset-password-modal'
import { captureReturnDestination } from '@/composables/auth/return-destination'
import { provideWelcomeLayout } from './welcome-layout'
import Splash from './splash/index.vue'
import SectionFeatures from './section-features/index.vue'
import SectionPricing from './section-pricing/index.vue'
import SectionRoadmap from './section-roadmap/index.vue'
import WelcomeFooter from '@/views/welcome/welcome-footer.vue'

const session = useSessionStore()
const route = useRoute()
const { open: openSignup } = useSignupModal()
const resetPasswordModal = useResetPasswordModal()
const features = useTemplateRef('features')
const roadmap = useTemplateRef('roadmap')

provideWelcomeLayout()

// The checkpoint has already sent a signed-in visitor into the app, so a mount
// here means a signed-out sign-in surface. Two things to settle: open the reset
// dialog for a recovery link, and stash any `?next=` destination so it survives
// the sign-in (including the full-page OAuth redirect).
onMounted(async () => {
  if (await session.checkPasswordRecovery()) {
    resetPasswordModal.open()
    return
  }

  captureReturnDestination(route.query.next)
})

function scrollToContent() {
  features.value?.$el?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToRoadmap() {
  roadmap.value?.$el?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <splash :signup="openSignup" :see-more="scrollToContent" />
  <section-features ref="features" :see-roadmap="scrollToRoadmap" />
  <section-pricing />
  <section-roadmap ref="roadmap" />
  <welcome-footer />
</template>
