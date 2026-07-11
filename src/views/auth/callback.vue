<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase-client'
import { consumeOAuthPopupFlag } from '@/api/session'

const router = useRouter()

onMounted(async () => {
  await supabase.auth.getSession()

  if (consumeOAuthPopupFlag()) {
    window.close()
    return
  }

  router.push({ name: 'dashboard' })
})
</script>
