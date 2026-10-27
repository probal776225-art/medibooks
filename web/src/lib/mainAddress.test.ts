import { describe, expect, it } from 'vitest'
import { mainAddressUrl } from './mainAddress'

const at = (url: string) => {
  const u = new URL(url)
  return { hostname: u.hostname, pathname: u.pathname, search: u.search, hash: u.hash }
}
const MAIN = 'https://msallopathic.store'

describe('mainAddressUrl', () => {
  it('sends the Firebase addresses and www to the same page on the main address', () => {
    expect(mainAddressUrl(at('https://medibooks.web.app/customers/01711000000?x=1#top'), MAIN)).toBe(
      'https://msallopathic.store/customers/01711000000?x=1#top',
    )
    expect(mainAddressUrl(at('https://baki-khata-d7304.web.app/'), MAIN)).toBe('https://msallopathic.store/')
    expect(mainAddressUrl(at('https://baki-khata-d7304.firebaseapp.com/sms-log'), MAIN)).toBe('https://msallopathic.store/sms-log')
    expect(mainAddressUrl(at('https://www.msallopathic.store/'), MAIN)).toBe('https://msallopathic.store/')
  })

  it('leaves the main address, local development and builds without a main address alone', () => {
    expect(mainAddressUrl(at('https://msallopathic.store/customers'), MAIN)).toBeNull()
    expect(mainAddressUrl(at('http://localhost:5173/'), MAIN)).toBeNull()
    expect(mainAddressUrl(at('http://192.168.0.5:5173/'), MAIN)).toBeNull()
    expect(mainAddressUrl(at('https://medibooks.web.app/'), undefined)).toBeNull()
    expect(mainAddressUrl(at('https://medibooks.web.app/'), '')).toBeNull()
    expect(mainAddressUrl(at('https://medibooks.web.app/'), 'not a url')).toBeNull()
  })
})
