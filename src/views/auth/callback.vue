<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase-client'
import { consumeOAuthPopupFlag, isNewAccountSession } from '@/api/session'
import { consumeReturnDestination } from '@/composables/auth/return-destination'
import { useTracking } from '@/composables/tracking'

const router = useRouter()
const tracking = useTracking()

onMounted(async () => {
  await supabase.auth.getSession()

  // Popup flow: the opener tab owns the navigation, so this tab just closes
  // itself — the opener is the one that tracks completion for this leg.
  if (consumeOAuthPopupFlag()) {
    window.close()
    return
  }

  // Redirect flow: this tab is the one that resolves, so it's the one that
  // tracks a brand-new account before moving on.
  if (await isNewAccountSession()) tracking.trackSignupCompleted()

  // Land on the destination stashed before the OAuth round trip, falling back to the dashboard.
  router.push(consumeReturnDestination() ?? { name: 'dashboard' })
})
</script>
