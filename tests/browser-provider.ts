import {
  PlaywrightBrowserProvider,
  playwright as basePlaywright,
  type PlaywrightProviderOptions
} from 'vite-plus/test/browser-playwright'
import type { BrowserContext } from 'playwright'

// The vitest Playwright provider registers a `context.route` handler per
// vi.mock()'d module and tears them down with an async `unroute` on each
// isolated test reload. When teardown lags re-registration, a late
// `route.fulfill()` fires on an already-served request and Playwright throws
// "Route is already handled!". The mock was already delivered by the winning
// handler, so the error is benign — but it escapes as an unhandled rejection
// and fails the whole run (intermittent CI flake). Upstream
// @vitest/browser-playwright does not guard this even on its latest release.
//
// This wraps the provider so every route handler swallows that one benign
// error (and nothing else), mirroring the fix mswjs/playwright shipped for the
// same Playwright failure mode. It lives here rather than as a node_modules
// patch so it survives reinstalls and toolchain bumps untouched.

const ALREADY_HANDLED = /already handled/i

type RouteFn = BrowserContext['route']
type RouteArgs = Parameters<RouteFn>
type GuardedContext = BrowserContext & { __vitestRouteGuarded?: boolean }

/** Wrap a context's `route` once so mock handlers swallow "Route is already handled!". */
function guardContextRoute(context: BrowserContext): void {
  const guarded = context as GuardedContext
  if (guarded.__vitestRouteGuarded) return
  guarded.__vitestRouteGuarded = true

  const route = context.route.bind(context) as RouteFn

  context.route = ((matcher: RouteArgs[0], handler: RouteArgs[1], options: RouteArgs[2]) =>
    route(
      matcher,
      async (route_, request) => {
        try {
          await handler(route_, request)
        } catch (error) {
          if (!ALREADY_HANDLED.test((error as Error | undefined)?.message ?? '')) throw error
        }
      },
      options
    )) as RouteFn
}

/** Drop-in for `playwright()` that guards every browser context against the benign route race. */
export function playwright(options?: PlaywrightProviderOptions) {
  const descriptor = basePlaywright(options)
  const baseFactory = descriptor.providerFactory

  descriptor.providerFactory = (project) => {
    const provider = baseFactory(project) as PlaywrightBrowserProvider
    const openPage = provider.openPage.bind(provider)

    provider.openPage = async (sessionId, url, openOptions) => {
      await openPage(sessionId, url, openOptions)
      const context = provider.contexts.get(sessionId)
      if (context) guardContextRoute(context)
    }

    return provider
  }

  return descriptor
}
