// OAuth access token for the Firebase service account (secret SERVICE_ACCOUNT_JSON): a signed RS256 JWT is
// exchanged for a one-hour token, kept in memory and reused while this Worker instance lives.
import { importPKCS8, SignJWT } from 'jose'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/datastore'

let cached: { token: string; expiresAt: number } | null = null

export async function serviceAccountToken(json: string | undefined, onRequest?: () => void): Promise<string> {
  const now = Date.now()
  if (cached && cached.expiresAt - 60_000 > now) return cached.token
  if (!json) throw new Error('SERVICE_ACCOUNT_JSON is not set (wrangler secret put SERVICE_ACCOUNT_JSON)')
  const sa = JSON.parse(json) as { client_email?: string; private_key?: string }
  if (!sa.client_email || !sa.private_key) throw new Error('SERVICE_ACCOUNT_JSON is not a service account key file')
  const key = await importPKCS8(sa.private_key, 'RS256')
  const iat = Math.floor(now / 1000)
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(iat)
    .setExpirationTime(iat + 3600)
    .sign(key)
  onRequest?.()
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const body = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: body.access_token, expiresAt: now + body.expires_in * 1000 }
  return cached.token
}
