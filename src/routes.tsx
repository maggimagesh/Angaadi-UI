import type { ReactElement } from 'react'

import HomePage from './pages/Home'
import AuthPage from './pages/Auth'
import OAuthCallback from './pages/OAuthCallback'
import ProfilePage from './pages/Profile'
import HealthPage from './pages/Health'
import ProductsListing from './pages/ProductsListing'
import ProductDetails from './pages/ProductDetails'
import CartPage from './pages/Cart'
import CheckoutPage from './pages/Checkout'
import CheckoutConfirmation from './pages/CheckoutConfirmation'
import WishlistPage from './pages/Wishlist'
import ComparePage from './pages/Compare'
import PlaygroundPage from './pages/Playground'
import CookieConsentGallery from './pages/CookieConsentGallery'
import CookieDesignDetails from './pages/CookieDesignDetails'
import InfiniteScrollPage from './pages/InfiniteScrollPage'
import SlowInfiniteScrollPage from './pages/SlowInfiniteScrollPage'
import IframePage from './pages/IframePage'
import IframeFullPage from './pages/IframeFullPage'
import ShadowDomPage from './pages/ShadowDomPage'
import ShadowDomFullPage from './pages/ShadowDomFullPage'
import ShadowIframePage from './pages/ShadowIframePage'
import MultiScrollPage from './pages/MultiScrollPage'
import InfiniteTextScrollPage from './pages/InfiniteTextScrollPage'
import InfiniteHeavyScrollPage from './pages/InfiniteHeavyScrollPage'
import IframeContentPage from './pages/IframeContentPage'
import AllResponsesPage from './pages/AllResponsesPage'
import DualScrollPage from './pages/DualScrollPage'
import MouseOnlyScrollPage from './pages/MouseOnlyScrollPage'
import WebhookLanding from './pages/WebhookLanding'
import WebhookInspector from './pages/WebhookInspector'
import LegacyWebhookLanding from './pages/LegacyWebhookLanding'
import LegacyWebhookInspector from './pages/LegacyWebhookInspector'
import LoopDetectedPage from './pages/LoopDetectedPage'
import CrawlableDocuments from './pages/CrawlableDocuments'
import TeamSplitPage from './pages/TeamSplitPage'

/**
 * The router, as data.
 *
 * App.tsx renders one <Route> per entry and /playground lists every entry
 * whose `group` is set — so a new fixture appears on the index page without
 * anyone remembering to add it there. Paths are verbatim: nothing here renames,
 * merges or removes a route that already existed.
 */

export type RouteGroup =
  | 'scrolling'
  | 'embedding'
  | 'webhooks'
  | 'responses'
  | 'misc'

export type AppRoute = {
  path: string
  element: ReactElement
  /** Set on fixture routes only. Shopping routes leave it undefined. */
  group?: RouteGroup
  /** One line on what the fixture exercises. */
  description?: string
  /** The trap the fixture is built to catch. */
  watchOut?: string
}

export const GROUP_LABELS: Record<RouteGroup, string> = {
  scrolling: 'Scrolling',
  embedding: 'Iframes & shadow DOM',
  webhooks: 'Webhooks',
  responses: 'Responses, timing & failure',
  misc: 'Consent, docs & misc',
}

export const GROUP_ORDER: RouteGroup[] = [
  'scrolling',
  'embedding',
  'webhooks',
  'responses',
  'misc',
]

export const APP_ROUTES: AppRoute[] = [
  /* ── shopping ─────────────────────────────────────────────────────── */
  { path: '/', element: <HomePage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/login', element: <AuthPage /> },
  { path: '/oauth-callback', element: <OAuthCallback />, group: 'misc', description: 'The redirect target that completes a sign-in.', watchOut: 'Reached, never visited' },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/products', element: <ProductsListing /> },
  { path: '/product/:categoryId/:productId', element: <ProductDetails /> },
  { path: '/cart', element: <CartPage /> },
  { path: '/checkout', element: <CheckoutPage /> },
  { path: '/checkout/confirmation', element: <CheckoutConfirmation /> },
  { path: '/wishlist', element: <WishlistPage /> },
  { path: '/compare', element: <ComparePage /> },
  { path: '/playground', element: <PlaygroundPage /> },

  /* ── scrolling ────────────────────────────────────────────────────── */
  { path: '/infinite-scroll', element: <InfiniteScrollPage />, group: 'scrolling', description: 'A product list that appends a page each time you near the bottom.', watchOut: 'Stale element refs' },
  { path: '/slow-infinite-scroll', element: <SlowInfiniteScrollPage />, group: 'scrolling', description: 'The same list, with a deliberate delay before each page arrives.', watchOut: 'Hard-coded waits' },
  { path: '/infinite-text', element: <InfiniteTextScrollPage />, group: 'scrolling', description: 'Endless text rather than cards — no stable anchor to assert on.', watchOut: 'Text-based locators' },
  { path: '/infinite-heavy', element: <InfiniteHeavyScrollPage />, group: 'scrolling', description: 'A heavy DOM that keeps growing until the page struggles.', watchOut: 'Timeouts, memory' },
  { path: '/multi-scroll', element: <MultiScrollPage />, group: 'scrolling', description: 'Several scroll containers nested inside one another.', watchOut: 'Wrong scroll parent' },
  { path: '/dual-scroll', element: <DualScrollPage />, group: 'scrolling', description: 'Two independent panes scrolling side by side.', watchOut: 'Wrong scroll container' },
  { path: '/mouse-only-scroll', element: <MouseOnlyScrollPage />, group: 'scrolling', description: 'Scrolls on wheel events only — keyboard and scripted scroll do nothing.', watchOut: 'Synthetic scrolling' },

  /* ── iframes & shadow DOM ─────────────────────────────────────────── */
  { path: '/iframe', element: <IframePage />, group: 'embedding', description: 'Content inside a same-origin iframe on an ordinary page.', watchOut: 'Missing frame switch' },
  { path: '/iframe-full', element: <IframeFullPage />, group: 'embedding', description: 'An iframe filling the whole viewport, so the outer page looks empty.', watchOut: 'Empty-body assertions' },
  { path: '/iframe-content', element: <IframeContentPage />, group: 'embedding', description: 'The document the iframes load — also reachable directly.', watchOut: 'Testing the wrong URL' },
  { path: '/shadow-dom', element: <ShadowDomPage />, group: 'embedding', description: 'Controls inside a shadow root on a normal page.', watchOut: "Selector can't pierce" },
  { path: '/shadow-dom-full', element: <ShadowDomFullPage />, group: 'embedding', description: 'The entire page body inside one shadow root.', watchOut: 'Nothing in light DOM' },
  { path: '/shadow-iframe', element: <ShadowIframePage />, group: 'embedding', description: 'An iframe nested inside a shadow root — both barriers at once.', watchOut: 'Pierce, then switch' },

  /* ── webhooks ─────────────────────────────────────────────────────── */
  { path: '/valid-webhooks', element: <WebhookLanding />, group: 'webhooks', description: 'Current landing page — mints an inbox token.', watchOut: 'Token in URL' },
  { path: '/valid-webhooks/:token', element: <WebhookInspector />, group: 'webhooks', description: 'Current inspector — live log of inbound calls for that token.', watchOut: 'Polling races' },
  { path: '/webhook', element: <LegacyWebhookLanding />, group: 'webhooks', description: 'Legacy landing page, kept for old test suites.', watchOut: 'Deprecated' },
  { path: '/webhook/:token', element: <LegacyWebhookInspector />, group: 'webhooks', description: 'Legacy inspector.', watchOut: 'Deprecated' },
  { path: '/webhhook', element: <LegacyWebhookLanding />, group: 'webhooks', description: 'Deliberate typo alias of the legacy landing page.', watchOut: "Looks like a 404, isn't" },
  { path: '/webhhook/:token', element: <LegacyWebhookInspector />, group: 'webhooks', description: 'Typo alias of the legacy inspector.', watchOut: "Looks like a 404, isn't" },

  /* ── responses, timing & failure ──────────────────────────────────── */
  { path: '/all-resp', element: <AllResponsesPage />, group: 'responses', description: 'Every HTTP status the API can return, each on its own trigger.', watchOut: 'Error-path coverage' },
  { path: '/slow-loading', element: <HomePage />, group: 'responses', description: 'The home page, served slowly — same DOM, worse timing.', watchOut: 'Premature assertions' },
  { path: '/loop-detected', element: <LoopDetectedPage />, group: 'responses', description: 'A redirect loop that trips the guard.', watchOut: 'Navigation timeouts' },
  { path: '/health', element: <HealthPage />, group: 'responses', description: 'Service status rendered as a table.', watchOut: '—' },

  /* ── consent, docs & misc ─────────────────────────────────────────── */
  { path: '/cookie-consent', element: <CookieConsentGallery />, group: 'misc', description: 'Gallery of consent banner designs and their storage keys.', watchOut: 'Overlay blocks clicks' },
  { path: '/cookie-consent/:designId', element: <CookieDesignDetails />, group: 'misc', description: 'One banner design in isolation, full page.', watchOut: 'Per-design selectors' },
  { path: '/crawlableDocuments', element: <CrawlableDocuments />, group: 'misc', description: 'A document list meant for crawlers — note the camelCase path.', watchOut: 'Case-sensitive URL' },
  { path: '/team-split', element: <TeamSplitPage />, group: 'misc', description: 'Split calculation across dynamically added rows.', watchOut: 'Index drift' },
]

export const FIXTURE_ROUTES = APP_ROUTES.filter((r) => r.group)
