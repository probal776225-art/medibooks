import { isEmulator, type Env } from '../env'
import { bulkSmsBd } from './bulksmsbd'
import { fakeProvider } from './fake'
import type { SmsProvider } from './types'

/** The secret may hold the provider's whole sample URL (pasted as given); only its api_key value is the key. */
export function apiKeyFrom(raw: string): string {
  return /api_key=([^&\s]+)/.exec(raw)?.[1] ?? raw.trim()
}

/** The emulator always gets the fake provider, so local tests never cost money. */
export function providerFor(env: Env): SmsProvider {
  if (isEmulator(env) || env.SMS_PROVIDER === 'fake') return fakeProvider
  if (env.SMS_PROVIDER === 'bulksmsbd') {
    if (!env.SMS_API_KEY) throw new Error('SMS_API_KEY is not set (wrangler secret put SMS_API_KEY)')
    if (!env.SMS_SENDER_ID) throw new Error('SMS_SENDER_ID is not set')
    return bulkSmsBd(apiKeyFrom(env.SMS_API_KEY), env.SMS_SENDER_ID)
  }
  throw new Error(`Unknown SMS_PROVIDER "${env.SMS_PROVIDER}"`)
}
