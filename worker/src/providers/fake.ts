// Local development only: pretends to send. A text containing "[fail]" fails (to test retries).
import type { SmsProvider } from './types'

let count = 0

export const fakeProvider: SmsProvider = {
  name: 'fake',
  async send(to, text) {
    if (text.includes('[fail]')) return { ok: false, error: '1005 fake failure', retry: true }
    count += 1
    console.log(`[fake sms] to ${to}: ${text}`)
    return { ok: true, ref: `fake-${count}` }
  },
  async balance() {
    return 100
  },
}
