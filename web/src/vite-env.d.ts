/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_USE_EMULATOR?: string
  readonly VITE_EMULATOR_HOST?: string
  readonly VITE_OWNER_UID?: string
  readonly VITE_WORKER_URL?: string
  /** The one public address (https://msallopathic.store); the Firebase default addresses move there. Unset locally. */
  readonly VITE_MAIN_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
