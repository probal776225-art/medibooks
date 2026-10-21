import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'
import { create } from 'zustand'
import { auth } from '../data/firebase'

export interface AuthUser {
  uid: string
  email: string | null
}

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn'
  user: AuthUser | null
}

export const useAuthStore = create<AuthState>()(() => ({ status: 'loading', user: null }))

let started = false

/** Start listening once; Firebase restores the signed-in user from IndexedDB, also offline. */
export function initAuth(): void {
  if (started) return
  started = true
  onAuthStateChanged(auth, (u) => {
    useAuthStore.setState(
      u ? { status: 'signedIn', user: { uid: u.uid, email: u.email } } : { status: 'signedOut', user: null },
    )
  })
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}
