<script setup lang="ts">
import router from '@/router'
import { useSessionStore } from '@/stores/session'
import { onMounted, useTemplateRef } from 'vue'
import { useSignupModal } from './signup/signup-modal'
import { provideWelcomeLayout } from './welcome-layout'
import Splash from './splash/index.vue'
import SectionFeatures from './section-features/index.vue'
import SectionPricing from './section-pricing.vue'
import SectionRoadmap from './section-roadmap.vue'
import WelcomeFooter from '@/components/welcome-footer.vue'

const session = useSessionStore()
const { open: openSignup } = useSignupModal()
const features = useTemplateRef('features')
const roadmap = useTemplateRef('roadmap')

provideWelcomeLayout()

onMounted(async () => {
  const authenticated = await session.restoreSession()

  if (authenticated) {
    router.push({ name: 'authenticated' })
  }
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
  <section-pricing :signup="openSignup" />
  <section-roadmap ref="roadmap" />
  <welcome-footer />
</template>
