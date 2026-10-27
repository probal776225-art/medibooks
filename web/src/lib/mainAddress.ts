// One public address (the owner's choice, 2026-10-27): the Firebase default addresses (*.web.app, *.firebaseapp.com)
// and www send people to VITE_MAIN_ORIGIN, on the same page.

type Here = Pick<Location, 'hostname' | 'pathname' | 'search' | 'hash'>

/** Where this old address should go, or null on the main address, locally, or with no main address set. */
export function mainAddressUrl(here: Here, mainOrigin: string | undefined): string | null {
  if (!mainOrigin) return null
  let main: URL
  try {
    main = new URL(mainOrigin)
  } catch {
    return null
  }
  const host = here.hostname.toLowerCase()
  if (host === main.hostname) return null
  const old = host.endsWith('.web.app') || host.endsWith('.firebaseapp.com') || host === `www.${main.hostname}`
  return old ? `${main.origin}${here.pathname}${here.search}${here.hash}` : null
}
