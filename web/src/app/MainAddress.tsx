// Old addresses (*.web.app, *.firebaseapp.com, www) → the main one. Done in the app rather than as a Hosting redirect:
// a server redirect would catch sw.js too, and phones that installed the app from an old address would never update.
import { useEffect, useState } from 'react'
import { waitForPendingWrites } from 'firebase/firestore'
import { Button } from '../components/ui'
import { auth, db } from '../data/firebase'
import { useT } from '../i18n'
import { mainAddressUrl } from '../lib/mainAddress'
import { useOnline } from '../stores/sync'
import { useToastStore } from '../stores/toast'

const SEND_TIMEOUT_MS = 20_000

const mainUrl = (): string | null => mainAddressUrl(window.location, import.meta.env.VITE_MAIN_ORIGIN)

/**
 * Go to the main address — but never leave unsent bills behind: the offline queue is stored per address, so a signed-in
 * user's pending writes must reach the server first. False = stay for now (offline, or the server did not answer).
 */
async function moveToMainAddress(): Promise<boolean> {
  const target = mainUrl()
  if (!target) return false
  if (auth.currentUser) {
    if (!navigator.onLine) return false
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), SEND_TIMEOUT_MS))
    const sent = await Promise.race([waitForPendingWrites(db).then(() => true), timeout]).catch(() => false)
    if (!sent) return false
  }
  window.location.replace(target)
  return true
}

/** On an old address, once sign-in is known: true while moving (show the splash); false = run the app here. */
export function useMovingToMainAddress(authReady: boolean): boolean {
  const [moving, setMoving] = useState(() => mainUrl() !== null)
  useEffect(() => {
    if (!authReady || !moving) return
    let live = true
    void moveToMainAddress().then((moved) => {
      if (live && !moved) setMoving(false)
    })
    return () => {
      live = false
    }
  }, [authReady, moving])
  return moving
}

/** Shown on an old address when the start-up move could not happen (offline): one tap to go once online. */
export function MainAddressBanner() {
  const t = useT()
  const online = useOnline()
  const [busy, setBusy] = useState(false)
  const target = mainUrl()
  if (!target) return null

  async function go() {
    setBusy(true)
    if (!(await moveToMainAddress())) {
      setBusy(false)
      useToastStore.getState().show('error', 'move.notYet')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
      <p className="min-w-0 flex-1">{t('move.banner', { site: new URL(target).host })}</p>
      <Button variant="outline" className="min-h-10 text-sm" disabled={!online || busy} onClick={() => void go()}>
        {busy ? t('move.working') : t('move.go')}
      </Button>
    </div>
  )
}
