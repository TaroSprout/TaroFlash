<script setup lang="ts">
import router from '@/router'
import { useSessionStore } from '@/stores/session'
import { onMounted, useTemplateRef } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { useModal } from '@/composables/modal'
import Splash from './splash.vue'
import FeaturesSection from './features-section.vue'
import ConfigSection from './config-section.vue'
import PricingSection from './pricing-section.vue'
import RoadmapSection from './roadmap-section.vue'
import SignupDialog from './sign-up/sign-up.vue'
import WelcomeFooter from '@/components/welcome-footer.vue'

const session = useSessionStore()
const modal = useModal()
const features = useTemplateRef('features')

onMounted(async () => {
  const authenticated = await session.restoreSession()

  if (authenticated) {
    router.push({ name: 'authenticated' })
  }
})

function openSignup(payment?: boolean) {
  emitSfx('snappy_button_3')
  const { response } = modal.open(SignupDialog, { backdrop: true, props: { payment } })
  response.then(() => emitSfx('snappy_button_5'))
}

function scrollToContent() {
  features.value?.$el?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <splash :signup="openSignup" :see-more="scrollToContent" />
  <features-section ref="features" />
  <config-section />
  <pricing-section :signup="openSignup" />
  <roadmap-section />
  <welcome-footer />
</template>
