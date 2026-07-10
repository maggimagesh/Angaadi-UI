export type WebhookBodyFormat = 'empty' | 'json' | 'text' | 'binary'
export type WebhookBodyEncoding = 'none' | 'utf8' | 'base64'

export interface WebhookStoredBody {
  format: WebhookBodyFormat
  encoding: WebhookBodyEncoding
  sizeBytes: number
  contentType: string | null
  text: string | null
  json: unknown | null
  base64: string | null
  preview: string | null
  truncated?: boolean
  downloadUrl?: string | null
}

export interface WebhookResponseInfo {
  statusCode: number
  headers: Record<string, string>
  body: unknown | null
  text: string | null
}

export interface WebhookSenderGeo {
  country: string | null
  region: string | null
  city: string | null
  latitude: string | null
  longitude: string | null
  timezone: string | null
  source: string | null
}

export interface WebhookForwardedInfo {
  for: string[]
  proto: string | null
  host: string | null
  port: string | null
  raw: string | null
}

export interface WebhookSenderInfo {
  ip: string | null
  ipSource: string | null
  callbackSenderIp?: string | null
  callbackSenderIpSource?: string | null
  flyClientIp?: string | null
  flyForwardedIp?: string | null
  flyProxyIp?: string | null
  ipChain: string[]
  remoteAddress: string | null
  remotePort: number | null
  remoteFamily: string | null
  reverseDns: string[] | null
  userAgent: string | null
  clientApp: string | null
  httpVersion: string | null
  protocol: 'http' | 'https' | null
  secureConnection: boolean
  host: string | null
  origin: string | null
  referer: string | null
  accept: string | null
  acceptLanguage: string | null
  acceptEncoding: string | null
  contentType: string | null
  contentLength: number | null
  transferEncoding: string | null
  connection: string | null
  authorizationPresent: boolean
  signatureHeaders: Record<string, string>
  forwarded: WebhookForwardedInfo
  proxyHeaders: Record<string, string>
  geo: WebhookSenderGeo | null
}

export interface WebhookCaptureRecord {
  id: string
  token: string
  receivedAt: string
  method: string
  path: string
  url: string
  query: Record<string, string | string[]>
  headers: Record<string, string | string[]>
  cookies: Record<string, string>
  ip: string | null
  callbackSenderIp?: string | null
  sender?: WebhookSenderInfo
  body: WebhookStoredBody
  response: WebhookResponseInfo
}

export interface WebhookCaptureListResponse {
  token: string
  captureUrl: string
  inspectUrl: string
  requests: WebhookCaptureRecord[]
  authEnabled?: boolean
  blocked?: WebhookBlockedRecord[]
}

export interface WebhookAuthHeader {
  name: string
  value: string
}

export interface WebhookAuthConfig {
  enabled: boolean
  headers: WebhookAuthHeader[]
  updatedAt: string | null
}

export type WebhookBlockedReason = 'missing-header' | 'header-mismatch'

export interface WebhookBlockedRecord {
  id: string
  token: string
  receivedAt: string
  method: string
  path: string
  url: string
  ip: string | null
  ipSource: string | null
  userAgent: string | null
  clientApp: string | null
  host: string | null
  origin: string | null
  reason: WebhookBlockedReason
  missingHeaders: string[]
  mismatchedHeaders: string[]
}

const WEBHOOK_TOKEN_REGEX = /^[A-Za-z0-9_-]{10,128}$/

function getEnvValue(key: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key]
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    return '/valid-webhooks'
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.replace(/\/+$/, '')
}

function deriveOriginFromApiBase(apiBaseUrl: string | undefined): string | null {
  if (!apiBaseUrl) {
    return null
  }

  try {
    return normalizeOrigin(new URL(apiBaseUrl).origin)
  } catch {
    return null
  }
}

export function getWebhookApiOrigin(): string {
  const envOrigin = getEnvValue('VITE_WEBHOOK_API_ORIGIN') || getEnvValue('VITE_API_ORIGIN')
  const backendApiBase = getEnvValue('VITE_BACKEND_URL') || getEnvValue('BACKEND_URL')
  const backendOrigin = deriveOriginFromApiBase(backendApiBase)

  if (envOrigin) {
    return normalizeOrigin(envOrigin)
  }

  if (backendOrigin) {
    return backendOrigin
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3300`
  }

  return 'http://localhost:3300'
}

export function getWebhookPublicApiOrigin(): string {
  const envOrigin = getEnvValue('VITE_WEBHOOK_PUBLIC_API_ORIGIN')

  if (envOrigin) {
    return normalizeOrigin(envOrigin)
  }

  return getWebhookApiOrigin()
}

export function isValidWebhookToken(token: string): boolean {
  return WEBHOOK_TOKEN_REGEX.test(token)
}

export function createWebhookToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }

  const randomPart = Math.random().toString(36).slice(2)
  const timestampPart = Date.now().toString(36)
  return `${timestampPart}${randomPart}`.slice(0, 24)
}

export function buildWebhookCaptureUrl(token: string): string {
  const basePath = normalizeBasePath(getEnvValue('VITE_WEBHOOK_UI_BASE_PATH') || '/valid-webhooks')
  return `${getWebhookPublicApiOrigin()}${basePath}/${encodeURIComponent(token)}`
}

export function buildWebhookRequestsApiUrl(token: string): string {
  return `${getWebhookApiOrigin()}/api/webhook/${encodeURIComponent(token)}/requests`
}

export function buildWebhookBodyDownloadUrl(
  token: string,
  requestId: string,
  serverDownloadPath?: string | null
): string {
  if (serverDownloadPath && serverDownloadPath.startsWith('/')) {
    return `${getWebhookApiOrigin()}${serverDownloadPath}`
  }
  return `${getWebhookApiOrigin()}/api/webhook/${encodeURIComponent(token)}/${encodeURIComponent(requestId)}/body`
}

export function buildWebhookDownloadAllUrl(token: string): string {
  return `${getWebhookApiOrigin()}/api/webhook/${encodeURIComponent(token)}/download`
}

export function buildWebhookInspectorPath(token: string): string {
  const basePath = normalizeBasePath(getEnvValue('VITE_WEBHOOK_UI_BASE_PATH') || '/valid-webhooks')
  return `${basePath}/${encodeURIComponent(token)}`
}

export function buildWebhookInspectorUrl(token: string): string {
  if (typeof window === 'undefined') {
    return buildWebhookInspectorPath(token)
  }

  return `${window.location.origin}${buildWebhookInspectorPath(token)}`
}

export function isLoopbackWebhookOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)

    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
  } catch {
    return false
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const errorMessage =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Request failed with status ${response.status}`

    throw new Error(errorMessage)
  }

  return payload as T
}

export async function fetchWebhookRequests(token: string): Promise<WebhookCaptureListResponse> {
  const response = await fetch(buildWebhookRequestsApiUrl(token), {
    headers: {
      Accept: 'application/json',
    },
  })

  return parseJsonResponse<WebhookCaptureListResponse>(response)
}

export async function clearWebhookRequests(token: string): Promise<{ ok: true; token: string; deleted: number }> {
  const response = await fetch(buildWebhookRequestsApiUrl(token), {
    method: 'DELETE',
  })

  return parseJsonResponse<{ ok: true; token: string; deleted: number }>(response)
}

export function buildWebhookAuthApiUrl(token: string): string {
  return `${getWebhookApiOrigin()}/api/webhook/${encodeURIComponent(token)}/auth`
}

export function buildWebhookBlockedApiUrl(token: string): string {
  return `${getWebhookApiOrigin()}/api/webhook/${encodeURIComponent(token)}/blocked`
}

export async function fetchWebhookAuthConfig(token: string): Promise<WebhookAuthConfig> {
  const response = await fetch(buildWebhookAuthApiUrl(token), {
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = await parseJsonResponse<{ token: string; config: WebhookAuthConfig }>(response)
  return payload.config
}

export async function saveWebhookAuthConfig(
  token: string,
  config: Pick<WebhookAuthConfig, 'enabled' | 'headers'>
): Promise<WebhookAuthConfig> {
  const response = await fetch(buildWebhookAuthApiUrl(token), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(config),
  })

  const payload = await parseJsonResponse<{ ok: true; token: string; config: WebhookAuthConfig }>(
    response
  )
  return payload.config
}

export async function clearWebhookBlockedAttempts(
  token: string
): Promise<{ ok: true; token: string; deleted: number }> {
  const response = await fetch(buildWebhookBlockedApiUrl(token), {
    method: 'DELETE',
  })

  return parseJsonResponse<{ ok: true; token: string; deleted: number }>(response)
}
