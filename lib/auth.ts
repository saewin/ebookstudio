export const SESSION_COOKIE_NAME = 'ebookstudio_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export interface AuthConfig {
  username: string
  password: string
  secret: string
  configured: boolean
}

export function getAuthConfig(): AuthConfig {
  const username = process.env.STUDIO_USERNAME?.trim() ?? ''
  const password = process.env.STUDIO_PASSWORD ?? ''
  const explicitSecret = process.env.AUTH_SECRET?.trim() ?? ''
  const configured = Boolean(username && password)
  const secret = explicitSecret || (configured ? `ebookstudio-fallback:${username}:${password}` : '')

  return { username, password, secret, configured }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return new Uint8Array(signature)
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const config = getAuthConfig()
  if (!config.configured) return false

  const compareKey = config.secret || 'ebookstudio-cred-compare'
  const [givenUserHash, expectedUserHash, givenPassHash, expectedPassHash] = await Promise.all([
    hmacSha256(compareKey, `u:${username.trim()}`),
    hmacSha256(compareKey, `u:${config.username}`),
    hmacSha256(compareKey, `p:${password}`),
    hmacSha256(compareKey, `p:${config.password}`),
  ])

  const userOk = timingSafeEqual(givenUserHash, expectedUserHash)
  const passOk = timingSafeEqual(givenPassHash, expectedPassHash)
  return userOk && passOk
}

export async function createSessionToken(username: string): Promise<string> {
  const config = getAuthConfig()
  if (!config.configured || !config.secret) {
    throw new Error('Authentication is not configured')
  }

  const payloadObj = {
    u: username,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  }
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payloadObj)))
  const sigBytes = await hmacSha256(config.secret, payload)
  const sig = bytesToBase64Url(sigBytes)
  return `${payload}.${sig}`
}

export async function verifySessionToken(token: string | undefined): Promise<{ username: string } | null> {
  if (!token) return null
  const config = getAuthConfig()
  if (!config.configured || !config.secret) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts

  const givenSigBytes = base64UrlToBytes(sig)
  if (!givenSigBytes) return null

  const expectedSigBytes = await hmacSha256(config.secret, payload)
  if (!timingSafeEqual(givenSigBytes, expectedSigBytes)) return null

  const payloadBytes = base64UrlToBytes(payload)
  if (!payloadBytes) return null

  try {
    const parsed = JSON.parse(new TextDecoder().decode(payloadBytes)) as { u?: unknown; exp?: unknown }
    if (typeof parsed.u !== 'string' || typeof parsed.exp !== 'number') return null
    if (parsed.exp <= Date.now()) return null
    if (parsed.u !== config.username) return null
    return { username: parsed.u }
  } catch {
    return null
  }
}

export function isSafeNextPath(next: string | null | undefined): string {
  if (!next) return '/'
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) {
    return '/'
  }
  return next
}
