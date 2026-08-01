import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useMemberStore } from '@/stores/member'
import { useCan } from '@/composables/can'
import { isPasswordRecoveryUrl } from '@/api/session'
import { prefetchMemberById } from '@/api/members'
import AuthenticatedView from '@/views/app-shell/authenticated.vue'

const WelcomeView = () => import('@/views/welcome/index.vue')
const PrivacyPolicyView = () => import('@/views/privacy-policy.vue')
const TermsOfServiceView = () => import('@/views/terms-of-service.vue')
const AuthCallbackView = () => import('@/views/auth/callback.vue')
const Dashboard = () => import('@/views/dashboard/index.vue')
const DeckView = () => import('@/views/deck/deck-view.vue')
const LessonView = () => import('@/views/audio-reader/lesson/index.vue')

// Each screen declares which checkpoint policies apply; the single beforeEach
// below reads this rather than hardcoding exceptions per route.
declare module 'vue-router' {
  interface RouteMeta {
    // Signed-in-only: a signed-out visitor is bounced to sign-in.
    requiresAuth?: boolean
    // Marketing/auth surface: a signed-in visitor is sent into the app.
    guestOnly?: boolean
    // Gated screen: the named useCan capability must be true to enter.
    capability?: 'useAudioReader'
  }
}

// Resolves the member row before the capability check reads any field off it.
// The store is a projection of a query App.vue starts reactively and nothing
// awaits, so a direct URL hit can otherwise read an empty role mid-restore.
// Colada dedupes, so this joins the in-flight fetch rather than issuing a
// second one.
async function resolveMember() {
  const id = useSessionStore().user?.id
  if (id) await prefetchMemberById(id).catch(() => {})

  return useMemberStore()
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // The app scrolls the page (not inner containers), so reset to the top on each
  // navigation — including chapter-to-chapter param changes — and restore the
  // saved position on back/forward.
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    {
      path: '/welcome',
      name: 'welcome',
      component: WelcomeView,
      meta: { guestOnly: true }
    },
    {
      path: '/privacy',
      name: 'privacy-policy',
      component: PrivacyPolicyView
    },
    {
      path: '/terms',
      name: 'terms-of-service',
      component: TermsOfServiceView
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallbackView
    },
    {
      path: '/',
      name: 'authenticated',
      component: AuthenticatedView,
      redirect: '/dashboard',
      // Merged onto every child, so the whole shell is signed-in-only.
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: Dashboard
        },
        {
          path: 'deck/:id',
          name: 'deck',
          component: DeckView,
          props: true
        },
        {
          path: 'audio-reader/collection/:collectionId/lesson/:lessonId',
          name: 'lesson',
          component: LessonView,
          props: true,
          meta: { capability: 'useAudioReader' }
        }
      ]
    }
  ]
})

// The single auth checkpoint every navigation passes through. Reads each route's
// declared policies and runs them in a fixed order — auth, then guestOnly, then
// capability — with the first failure winning. Identity resolves once via the
// session store's memoized ensureResolved(); only the capability branch pays for
// the member row.
router.beforeEach(async (to) => {
  const session = useSessionStore()

  // 1. auth — a signed-in-only screen reached while signed out sends the visitor
  //    to sign-in, carrying where they were headed so it survives the round trip.
  if (to.meta.requiresAuth && !(await session.ensureResolved())) {
    return { name: 'welcome', query: { next: to.fullPath } }
  }

  // 2. guestOnly — a marketing/auth page reloaded while signed in jumps to the
  //    app. Skipped on a password-recovery link (whose redirect lands on
  //    /welcome) so the reset dialog there stays reachable.
  if (to.meta.guestOnly && !isPasswordRecoveryUrl() && (await session.ensureResolved())) {
    return { name: 'dashboard' }
  }

  // 3. capability — a gated screen checks the member is allowed in, once the row
  //    has resolved. Reuses the single admin rule in useCan; no second copy.
  if (to.meta.capability) {
    await resolveMember()
    if (!useCan()[to.meta.capability].value) return { name: 'dashboard' }
  }
})

export default router
