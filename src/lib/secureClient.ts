import { buildApiUrl } from './api'

/**
 * Secure API client.
 *
 * All DB-backed API calls are tunneled through POST /secure/proxy with the
 * request and response payloads encrypted using AES-256-GCM. The session key
 * is negotiated with the server via an ephemeral ECDH (P-256) handshake and
 * held only in memory (non-extractable CryptoKey), so the browser Network tab
 * shows nothing but ciphertext.
 */

const HKDF_INFO = 'angaadi-secure-proxy-v1'

interface SecureSession {
  key: CryptoKey
  token: string
  exp: number
}

let session: SecureSession | null = null
let handshakePromise: Promise<SecureSession> | null = null

function b64uEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64uDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return arr
}

async function performHandshake(): Promise<SecureSession> {
  const clientKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  )
  const clientPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', clientKeys.publicKey))

  const response = await fetch(buildApiUrl('/secure/handshake'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pub: b64uEncode(clientPubRaw) }),
  })
  if (!response.ok) {
    throw new Error('Secure handshake failed')
  }
  const { pub, token, exp } = await response.json()

  const serverPubRaw = b64uDecode(pub)
  const serverPubKey = await crypto.subtle.importKey(
    'raw',
    serverPubRaw as unknown as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: serverPubKey },
    clientKeys.privateKey,
    256
  )
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey'])

  const salt = new Uint8Array(clientPubRaw.length + serverPubRaw.length)
  salt.set(clientPubRaw, 0)
  salt.set(serverPubRaw, clientPubRaw.length)

  const aesKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(HKDF_INFO) },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable: the key material can never be read out of memory
    ['encrypt', 'decrypt']
  )

  return { key: aesKey, token, exp }
}

async function getSession(forceNew = false): Promise<SecureSession> {
  // Refresh 30s before expiry to avoid racing the server-side check.
  if (!forceNew && session && Date.now() < session.exp - 30_000) return session
  if (forceNew) session = null
  if (!handshakePromise) {
    handshakePromise = performHandshake()
      .then((s) => {
        session = s
        return s
      })
      .finally(() => {
        handshakePromise = null
      })
  }
  return handshakePromise
}

async function encrypt(key: CryptoKey, data: unknown): Promise<{ iv: string; d: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  )
  return { iv: b64uEncode(iv), d: b64uEncode(ct) }
}

async function decrypt(key: CryptoKey, iv: string, d: string): Promise<unknown> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64uDecode(iv) as unknown as ArrayBuffer },
    key,
    b64uDecode(d) as unknown as ArrayBuffer
  )
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export interface SecureFetchInit {
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface SecureResponse {
  ok: boolean
  status: number
  json: () => Promise<any>
}

/**
 * Drop-in replacement for `fetch(buildApiUrl(path), init)` that tunnels the
 * request through the encrypted proxy. Returns an object exposing the same
 * `ok` / `status` / `json()` surface the API modules already use.
 */
export async function secureFetch(path: string, init: SecureFetchInit = {}): Promise<SecureResponse> {
  const method = (init.method || 'GET').toUpperCase()

  // Only forward headers the proxy accepts; everything else is dropped.
  const headers: Record<string, string> = {}
  for (const [name, value] of Object.entries(init.headers || {})) {
    const lower = name.toLowerCase()
    if (lower === 'authorization' || lower === 'content-type') headers[lower] = value
  }

  let body: unknown = null
  if (init.body !== undefined && init.body !== null) {
    try {
      body = JSON.parse(init.body)
    } catch {
      body = init.body
    }
  }

  const send = async (s: SecureSession): Promise<Response> => {
    const envelope = await encrypt(s.key, {
      p: path,
      m: method,
      h: headers,
      b: body,
      ts: Date.now(),
      n: b64uEncode(crypto.getRandomValues(new Uint8Array(16))),
    })
    return fetch(buildApiUrl('/secure/proxy'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t: s.token, iv: envelope.iv, d: envelope.d }),
    })
  }

  let s = await getSession()
  let response = await send(s)

  // 401 from the proxy means the wrapped session token expired: re-handshake once.
  if (response.status === 401) {
    s = await getSession(true)
    response = await send(s)
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    return {
      ok: false,
      status: response.status,
      json: async () => ({ error: err.error || 'Secure proxy error', message: err.error || 'Secure proxy error' }),
    }
  }

  const { iv, d } = await response.json()
  const inner = (await decrypt(s.key, iv, d)) as { s: number; b: any }

  return {
    ok: inner.s >= 200 && inner.s < 300,
    status: inner.s,
    json: async () => inner.b,
  }
}
