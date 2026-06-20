<script setup lang="ts">
import router from '@/router'
import { useSessionStore } from '@/stores/session'
import { onMounted } from 'vue'
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

onMounted(async () => {
  const authenticated = await session.restoreSession()

  if (authenticated) {
    router.push({ name: 'authenticated' })
  }
})

function openSignup(payment?: boolean) {
  const { response } = modal.open(SignupDialog, { backdrop: true, props: { payment } })
  response.then(() => emitSfx('double_pop_down'))
}
</script>

<template>
  <splash :signup="openSignup" />
  <features-section />
  <config-section />
  <pricing-section :signup="openSignup" />
  <roadmap-section />
  <welcome-footer />
</template>
