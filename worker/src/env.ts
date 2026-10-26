export interface Env {
  PROJECT_ID: string
  /** The shop owner's Firebase UID (the same one the security rules use). */
  OWNER_UID: string
  /** Set only for local development ("127.0.0.1:8080"); honoured only with a demo-* project. */
  FIRESTORE_EMULATOR_HOST?: string
  SMS_PROVIDER: string
  SMS_SENDER_ID: string
  /** Comma-separated origins allowed to call the Worker from a browser. */
  ALLOWED_ORIGINS: string
  /** Secrets (wrangler secret put). */
  SMS_API_KEY?: string
  SERVICE_ACCOUNT_JSON?: string
}

/**
 * Emulator mode: a demo-* project (which can never be a real Firebase project) plus an emulator host.
 * Only then are unsigned emulator sign-in tokens accepted and the fake SMS provider forced.
 */
export function isEmulator(env: Env): boolean {
  return Boolean(env.FIRESTORE_EMULATOR_HOST) && env.PROJECT_ID.startsWith('demo-')
}
