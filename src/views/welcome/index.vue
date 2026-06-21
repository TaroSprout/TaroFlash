<script setup lang="ts">
import router from '@/router'
import { useSessionStore } from '@/stores/session'
import { onMounted, useTemplateRef } from 'vue'
import { useSignupModal } from './sign-up/signup-modal'
import Splash from './splash/index.vue'
import SectionFeatures from './section-features.vue'
import SectionConfig from './section-config.vue'
import SectionPricing from './section-pricing.vue'
import SectionRoadmap from './section-roadmap.vue'
import WelcomeFooter from '@/components/welcome-footer.vue'

const session = useSessionStore()
const { open: openSignup } = useSignupModal()
const features = useTemplateRef('features')

onMounted(async () => {
  const authenticated = await session.restoreSession()

  if (authenticated) {
    router.push({ name: 'authenticated' })
  }
})

function scrollToContent() {
  features.value?.$el?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <splash :signup="openSignup" :see-more="scrollToContent" />
  <section-features ref="features" />
  <section-config />
  <section-pricing :signup="openSignup" />
  <section-roadmap />
  <welcome-footer />
</template>
