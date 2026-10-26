import { isEmulator, type Env } from './env'
import { Firestore } from './firestore'
import { serviceAccountToken } from './google'
import { providerFor } from './providers'
import type { SmsProvider } from './providers/types'

/**
 * Cloudflare's free plan allows 50 outgoing requests per run; Firestore needs a few, the rest are SMS.
 * Anything over this waits for the next run (the cron comes every 10 minutes).
 */
export const MAX_SENDS_PER_RUN = 30

export interface RunContext {
  env: Env
  fs: Firestore
  now: number
  /** Provider calls left in this run. */
  sendsLeft: number
  provider: () => SmsProvider
}

export function makeContext(env: Env): RunContext {
  let provider: SmsProvider | null = null
  return {
    env,
    fs: new Firestore({
      projectId: env.PROJECT_ID,
      emulatorHost: isEmulator(env) ? env.FIRESTORE_EMULATOR_HOST : undefined,
      token: () => serviceAccountToken(env.SERVICE_ACCOUNT_JSON),
    }),
    now: Date.now(),
    sendsLeft: MAX_SENDS_PER_RUN,
    provider: () => (provider ??= providerFor(env)),
  }
}
