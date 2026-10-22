// Device PIN lock: locked on open and after N idle minutes. The PIN hash and the lock preferences
// live in this browser only (localStorage) — each device has its own PIN.
import { create } from 'zustand'
import {
  DEFAULT_IDLE_MINUTES,
  idleExpired,
  lockoutMs,
  makePinRecord,
  parsePinRecord,
  verifyPin,
  type PinRecord,
} from '../domain/pin'
import { signOut } from './auth'

const PIN_KEY = 'baki.pin'
const PREFS_KEY = 'baki.lock'

interface LockPrefs {
  idleMinutes: number
  failures: number
  /** Millis; wrong PINs make the owner wait until then. */
  blockedUntil: number
}

interface LockState extends LockPrefs {
  hasPin: boolean
  /** Digits in this device's PIN (4 when there is none). */
  pinLength: number
  locked: boolean
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked: the lock still works for this session.
  }
}

function readPrefs(): LockPrefs {
  const prefs: LockPrefs = { idleMinutes: DEFAULT_IDLE_MINUTES, failures: 0, blockedUntil: 0 }
  try {
    const saved = JSON.parse(read(PREFS_KEY) ?? '{}') as Partial<LockPrefs>
    if (typeof saved.idleMinutes === 'number' && saved.idleMinutes > 0) prefs.idleMinutes = saved.idleMinutes
    if (typeof saved.failures === 'number') prefs.failures = saved.failures
    if (typeof saved.blockedUntil === 'number') prefs.blockedUntil = saved.blockedUntil
  } catch {
    // Keep defaults.
  }
  return prefs
}

const pinRecord = (): PinRecord | null => parsePinRecord(read(PIN_KEY))

// Locked on open when this device has a PIN.
export const useLockStore = create<LockState>()(() => {
  const record = pinRecord()
  return { ...readPrefs(), hasPin: record !== null, pinLength: record?.length ?? 4, locked: record !== null }
})

function savePrefs(patch: Partial<LockPrefs>): void {
  useLockStore.setState(patch)
  const { idleMinutes, failures, blockedUntil } = useLockStore.getState()
  write(PREFS_KEY, JSON.stringify({ idleMinutes, failures, blockedUntil }))
}

export type PinCheck = 'ok' | 'wrong' | 'blocked'

/** Check a PIN against this device's record. Wrong answers count towards the wait, wherever they are typed. */
export async function checkPin(pin: string): Promise<PinCheck> {
  const record = pinRecord()
  if (!record) return 'ok'
  if (Date.now() < useLockStore.getState().blockedUntil) return 'blocked'
  if (await verifyPin(pin, record)) {
    savePrefs({ failures: 0, blockedUntil: 0 })
    return 'ok'
  }
  const failures = useLockStore.getState().failures + 1
  const wait = lockoutMs(failures)
  savePrefs({ failures, blockedUntil: wait ? Date.now() + wait : 0 })
  return wait ? 'blocked' : 'wrong'
}

export async function unlockWithPin(pin: string): Promise<PinCheck> {
  const result = await checkPin(pin)
  if (result === 'ok') {
    useLockStore.setState({ locked: false })
    touchActivity()
  }
  return result
}

export async function setPin(pin: string): Promise<void> {
  write(PIN_KEY, JSON.stringify(await makePinRecord(pin)))
  savePrefs({ failures: 0, blockedUntil: 0 })
  useLockStore.setState({ hasPin: true, pinLength: pin.length, locked: false })
}

export function removePin(): void {
  write(PIN_KEY, null)
  savePrefs({ failures: 0, blockedUntil: 0 })
  useLockStore.setState({ hasPin: false, locked: false })
}

export function lockNow(): void {
  if (useLockStore.getState().hasPin) useLockStore.setState({ locked: true })
}

export function setIdleMinutes(idleMinutes: number): void {
  savePrefs({ idleMinutes })
}

/** A password sign-in proves the owner, so it also opens the lock. */
export function unlockAfterLogin(): void {
  useLockStore.setState({ locked: false })
  touchActivity()
}

/** "PIN ভুলে গেছি": forget this device's PIN and sign out; the owner signs in again with email + password. */
export async function forgetPinAndSignOut(): Promise<void> {
  removePin()
  await signOut()
}

let lastActivity = Date.now()

function touchActivity(): void {
  lastActivity = Date.now()
}

function checkIdle(): void {
  const s = useLockStore.getState()
  if (s.hasPin && !s.locked && idleExpired(Date.now(), lastActivity, s.idleMinutes)) {
    useLockStore.setState({ locked: true })
  }
}

/** Watch for input; lock after the idle time (checked every 15 s and whenever the app comes back to the front). */
export function startIdleWatch(): () => void {
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
  for (const e of events) window.addEventListener(e, touchActivity, { capture: true, passive: true })
  const onVisible = () => document.visibilityState === 'visible' && checkIdle()
  document.addEventListener('visibilitychange', onVisible)
  // A PIN set or removed in another tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key === PIN_KEY) {
      const record = pinRecord()
      useLockStore.setState((s) => ({ hasPin: record !== null, pinLength: record?.length ?? 4, locked: record !== null && s.locked }))
    }
  }
  window.addEventListener('storage', onStorage)
  const timer = setInterval(checkIdle, 15_000)
  return () => {
    for (const e of events) window.removeEventListener(e, touchActivity, { capture: true })
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('storage', onStorage)
    clearInterval(timer)
  }
}
