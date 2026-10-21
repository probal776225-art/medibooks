// Session data: realtime listeners on customers + settings while the owner is signed in.
import { waitForPendingWrites } from 'firebase/firestore'
import { create } from 'zustand'
import { db } from '../data/firebase'
import { subscribeCustomers } from '../data/repos/customers'
import { bootstrapSettings, subscribeSettings } from '../data/repos/settings'
import { DEFAULT_SETTINGS, type ShopSettings } from '../domain/settings'
import type { Customer } from '../domain/types'
import { useSyncStore } from './sync'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface DataState {
  customers: Customer[]
  byMobile: Map<string, Customer>
  customersStatus: LoadStatus
  customersFromCache: boolean
  settings: ShopSettings
  settingsStatus: LoadStatus
}

const initial: DataState = {
  customers: [],
  byMobile: new Map(),
  customersStatus: 'idle',
  customersFromCache: true,
  settings: DEFAULT_SETTINGS,
  settingsStatus: 'idle',
}

export const useDataStore = create<DataState>()(() => initial)

let stops: (() => void)[] = []

export function startSessionData(): void {
  if (stops.length) return
  useDataStore.setState({ customersStatus: 'loading', settingsStatus: 'loading' })

  // Writes queued before a reload (any collection) count as pending until the server has them.
  const sync = useSyncStore.getState()
  sync.beginWrite()
  waitForPendingWrites(db)
    .catch(() => undefined)
    .finally(() => useSyncStore.getState().endWrite())

  stops.push(
    subscribeCustomers(
      ({ customers, fromCache, pendingDocs }) => {
        useDataStore.setState({
          customers,
          byMobile: new Map(customers.map((c) => [c.mobile, c])),
          customersStatus: 'ready',
          customersFromCache: fromCache,
        })
        useSyncStore.getState().setPendingDocs(pendingDocs)
      },
      (e) => {
        console.error('Customers listener failed', e)
        useDataStore.setState({ customersStatus: 'error' })
      },
    ),
  )

  let bootstrapped = false
  stops.push(
    subscribeSettings(
      ({ settings, exists, fromCache }) => {
        useDataStore.setState({ settings, settingsStatus: 'ready' })
        if (!exists && !fromCache && !bootstrapped) {
          bootstrapped = true
          bootstrapSettings()
        }
      },
      (e) => {
        console.error('Settings listener failed', e)
        useDataStore.setState({ settingsStatus: 'error' })
      },
    ),
  )
}

export function stopSessionData(): void {
  for (const stop of stops) stop()
  stops = []
  useDataStore.setState(initial)
  useSyncStore.getState().setPendingDocs(0)
}
