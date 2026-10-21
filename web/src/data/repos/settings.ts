import { onSnapshot, serverTimestamp, setDoc, Timestamp, type Unsubscribe } from 'firebase/firestore'
import { DEFAULT_SETTINGS, withDefaults, type ShopSettings } from '../../domain/settings'
import { paths } from '../paths'
import { writeContext } from '../writer'

export interface SettingsSnapshot {
  settings: ShopSettings
  exists: boolean
  fromCache: boolean
}

export function subscribeSettings(onData: (s: SettingsSnapshot) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    paths.settings(),
    // Metadata changes too: "missing in cache" → "missing on server" changes only fromCache.
    { includeMetadataChanges: true },
    (snap) => onData({ settings: withDefaults(snap.data()), exists: snap.exists(), fromCache: snap.metadata.fromCache }),
    onError,
  )
}

/**
 * Create the settings doc with defaults. Call ONLY when the server (not the cache) says it is missing,
 * otherwise an offline first launch could overwrite real settings when it syncs.
 */
export function bootstrapSettings(): void {
  const ctx = writeContext()
  void setDoc(paths.settings(), {
    ...DEFAULT_SETTINGS,
    createdAt: Timestamp.fromMillis(ctx.now),
    createdBy: ctx.uid,
    updatedAt: serverTimestamp(),
  }).catch((e: unknown) => console.error('Settings bootstrap failed', e))
}
