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
}

export interface WebhookResponseInfo {
  statusCode: number
  headers: Record<string, string>
  body: unknown | null
  text: string | null
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
  body: WebhookStoredBody
  response: WebhookResponseInfo
}

export interface WebhookCaptureListResponse {
  token: string
  captureUrl: string
  inspectUrl: string
  requests: WebhookCaptureRecord[]
}

const WEBHOOK_TOKEN_REGEX = /^[A-Za-z0-9_-]{10,128}$/

function getEnvValue(key: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key]
}

export function getWebhookApiOrigin(): string {
  const envOrigin = getEnvValue('VITE_WEBHOOK_API_ORIGIN') || getEnvValue('VITE_API_ORIGIN')

  if (envOrigin) {
    return envOrigin.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3300`
  }

  return 'http://localhost:3300'
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
  return `${getWebhookApiOrigin()}/hook/${encodeURIComponent(token)}`
}

export function buildWebhookRequestsApiUrl(token: string): string {
  return `${getWebhookApiOrigin()}/api/webhook/${encodeURIComponent(token)}/requests`
}

export function buildWebhookInspectorPath(token: string): string {
  return `/webhook/${encodeURIComponent(token)}`
}

export function buildWebhookInspectorUrl(token: string): string {
  if (typeof window === 'undefined') {
    return buildWebhookInspectorPath(token)
  }

  return `${window.location.origin}${buildWebhookInspectorPath(token)}`
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
