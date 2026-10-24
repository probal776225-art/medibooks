// Staff accounts (Phase 14). The owner creates a staff login from the app with a second Firebase app
// instance (in-memory sign-in), so the owner's own session is not replaced; then writes members/{uid}.
import { getApps, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  initializeAuth,
  sendPasswordResetEmail,
  signOut,
  type Auth,
} from 'firebase/auth'
import { doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, collection, type Unsubscribe } from 'firebase/firestore'
import { SCHEMA_VERSION, type Millis } from '../../domain/types'
import { toMillis } from '../convert'
import { app, auth, db, usingEmulator } from '../firebase'
import { SHOP_ID } from '../paths'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'

export interface Member {
  uid: string
  name: string
  email: string
  role: 'staff'
  active: boolean
  createdAt: Millis
}

const membersCol = () => collection(db, 'shops', SHOP_ID, 'members')
const memberDoc = (uid: string) => doc(db, 'shops', SHOP_ID, 'members', uid)

function fromData(uid: string, d: Record<string, unknown>): Member {
  return {
    uid,
    name: typeof d.name === 'string' ? d.name : '',
    email: typeof d.email === 'string' ? d.email : '',
    role: 'staff',
    active: d.active === true,
    createdAt: toMillis(d.createdAt) ?? 0,
  }
}

/** The signed-in user's own record (null when there is none). */
export function subscribeMyMember(uid: string, onData: (m: Member | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    memberDoc(uid),
    (snap) => {
      const d = snap.data()
      onData(d && d.role === 'staff' ? fromData(uid, d) : null)
    },
    onError,
  )
}

/** Owner: every staff record, newest first. */
export function subscribeMembers(onData: (list: Member[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(membersCol(), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => fromData(d.id, d.data()))),
    onError,
  )
}

let adminAuth: Auth | null = null

function staffAdminAuth(): Auth {
  if (adminAuth) return adminAuth
  const second = getApps().find((a) => a.name === 'staff-admin') ?? initializeApp(app.options, 'staff-admin')
  adminAuth = initializeAuth(second, { persistence: inMemoryPersistence })
  if (usingEmulator) {
    const host = import.meta.env.VITE_EMULATOR_HOST || '127.0.0.1'
    connectAuthEmulator(adminAuth, `http://${host}:9099`, { disableWarnings: true })
  }
  return adminAuth
}

export class StaffError extends Error {
  readonly reason: 'emailTaken' | 'weakPassword' | 'badEmail' | 'offline' | 'failed'
  constructor(reason: StaffError['reason']) {
    super(`Staff: ${reason}`)
    this.reason = reason
  }
}

/** Needs internet (Firebase Auth creates the login). Throws StaffError. */
export async function createStaff(input: { name: string; email: string; password: string }): Promise<Member> {
  const ctx = writeContext()
  const name = input.name.replace(/\s+/g, ' ').trim().slice(0, 60)
  const email = input.email.trim().toLowerCase()
  let uid: string
  try {
    const second = staffAdminAuth()
    const cred = await createUserWithEmailAndPassword(second, email, input.password)
    uid = cred.user.uid
    await signOut(second)
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    throw new StaffError(
      code.includes('email-already-in-use')
        ? 'emailTaken'
        : code.includes('weak-password')
          ? 'weakPassword'
          : code.includes('invalid-email')
            ? 'badEmail'
            : code.includes('network')
              ? 'offline'
              : 'failed',
    )
  }
  const batch = newBatch()
  batch.set(memberDoc(uid), {
    role: 'staff',
    name,
    email,
    active: true,
    createdAt: Timestamp.fromMillis(ctx.now),
    createdBy: ctx.uid,
    updatedAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  })
  auditInBatch(batch, { action: 'member.create', entity: 'member', entityId: uid, before: null, after: { name, email } }, ctx)
  commitInBackground(batch)
  return { uid, name, email, role: 'staff', active: true, createdAt: ctx.now }
}

/** Turning a staff member off takes effect at once (rules check the record on every request). */
export function setStaffActive(m: Member, active: boolean): void {
  const ctx = writeContext()
  const batch = newBatch()
  batch.update(memberDoc(m.uid), { active, updatedAt: serverTimestamp() })
  auditInBatch(batch, { action: 'member.active', entity: 'member', entityId: m.uid, before: { active: m.active }, after: { active } }, ctx)
  commitInBackground(batch)
}

/** Firebase emails the staff member a link to set a new password. */
export async function sendStaffPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}
