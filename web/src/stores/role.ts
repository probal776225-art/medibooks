// Who is signed in: the owner (UID baked in at build time, same as in the rules) or a staff member
// (an active members/{uid} record). Anyone else — or a staff member who was turned off — gets no screens.
import { create } from 'zustand'
import { subscribeMyMember } from '../data/repos/members'

export type Role = 'loading' | 'owner' | 'staff' | 'disabled' | 'none'

interface RoleState {
  role: Role
  uid: string | null
  /** Staff member's name (empty for the owner). */
  name: string
}

export const useRoleStore = create<RoleState>()(() => ({ role: 'loading', uid: null, name: '' }))

const OWNER_UID = import.meta.env.VITE_OWNER_UID as string | undefined

let stop: (() => void) | null = null

export function startRole(uid: string): void {
  stopRole()
  if (uid === OWNER_UID) {
    useRoleStore.setState({ role: 'owner', uid, name: '' })
    return
  }
  useRoleStore.setState({ role: 'loading', uid, name: '' })
  stop = subscribeMyMember(
    uid,
    (member) => {
      // Older builds had no owner UID: then a user without a staff record is the owner.
      const role: Role = member ? (member.active ? 'staff' : 'disabled') : OWNER_UID ? 'none' : 'owner'
      useRoleStore.setState({ role, uid, name: member?.name ?? '' })
    },
    () => useRoleStore.setState({ role: OWNER_UID ? 'none' : 'owner', uid, name: '' }),
  )
}

export function stopRole(): void {
  stop?.()
  stop = null
  useRoleStore.setState({ role: 'loading', uid: null, name: '' })
}

export const useIsOwner = () => useRoleStore((s) => s.role === 'owner')
export const useIsStaff = () => useRoleStore((s) => s.role === 'staff')

/** For queries: a staff member may only read their own transactions (rules require the filter). */
export function staffScopeUid(): string | null {
  const s = useRoleStore.getState()
  return s.role === 'staff' ? s.uid : null
}
