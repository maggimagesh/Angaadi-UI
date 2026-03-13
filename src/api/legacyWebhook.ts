export type {
  WebhookBodyEncoding,
  WebhookBodyFormat,
  WebhookCaptureListResponse,
  WebhookCaptureRecord,
  WebhookResponseInfo,
  WebhookStoredBody,
} from './webhook'

import type { WebhookCaptureListResponse } from './webhook'

const WEBHOOK_TOKEN_REGEX = /^[A-Za-z0-9_-]{10,128}$/

function getEnvValue(key: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key]
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getWebhookApiOrigin(): string {
  const envOrigin = getEnvValue('VITE_WEBHOOK_API_ORIGIN') || getEnvValue('VITE_API_ORIGIN')

  if (envOrigin) {
    return normalizeOrigin(envOrigin)
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
  return `${getWebhookPublicApiOrigin()}/hook/${encodeURIComponent(token)}`
}

export function buildWebhookRequestsApiUrl(token: string): string {
  return `${getWebhookApiOrigin()}/api/webhook/${encodeURIComponent(token)}/requests`
}

export function buildWebhookInspectorPath(token: string): string {
  return `/webhhook/${encodeURIComponent(token)}`
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
