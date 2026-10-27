// Automas (sms.automas.com.bd) HTTP API — the owner's SMS account since 2026-10-27, non-masking sender id.
// Send: POST https://api.automas.com.bd/smsapiv3 with apikey, sender, msisdn, smstext (+ type=8 / smsformat=8 for Unicode).
// Balance: GET https://api.automas.com.bd/getbalancev3?apikey=… (the owner's panel link) → {"response":"1234.50"},
// or an error code ("106").
// Reply: {"response":[{"status":0,"id":296334,"msisdn":"01886888816"}]}. Status 0 = submitted; anything else is a code
// below (a failed reply carries an id too). An IP whitelist in the panel must stay off: Workers have no fixed IP (108).
import type { SendResult, SmsProvider } from './types'

const BASE = 'https://api.automas.com.bd'
const TIMEOUT_MS = 15_000

/** Codes worth another try later (nothing was sent). Everything else is permanent. */
const RETRY_CODES = new Set([1000, 2000, 2300, 3000, 3300, 4000])

const CODE_TEXT: Record<number, string> = {
  101: 'Invalid message length',
  102: 'Sender ID not valid',
  103: 'Authentication failed',
  104: 'Invalid user',
  105: 'Invalid number',
  106: 'Incorrect API key',
  107: 'Account suspended',
  108: 'IP address not allowed (turn the IP whitelist off in Automas)',
  109: 'API access not allowed',
  110: 'Number is on the Do Not Disturb list',
  111: 'Spam word in the message',
  1000: 'Insufficient balance',
  2000: 'Operator unavailable',
  2300: 'Operator route issue',
  2400: 'API access not allowed',
  3000: 'Operator unavailable',
  3300: 'Provider system error',
  4000: 'Operator unavailable',
}

function failure(code: number): Extract<SendResult, { ok: false }> {
  return { ok: false, error: `${code} ${CODE_TEXT[code] ?? ''}`.trim(), retry: RETRY_CODES.has(code) }
}

export function parseSendReply(httpStatus: number, body: string): SendResult {
  let first: Record<string, unknown> | null = null
  try {
    const response = (JSON.parse(body) as { response?: unknown } | null)?.response
    const row: unknown = Array.isArray(response) ? response[0] : null
    if (row && typeof row === 'object') first = row as Record<string, unknown>
  } catch {
    // not JSON
  }
  const code = first ? Number(first.status) : NaN
  if (code === 0) return { ok: true, ref: String(first?.id ?? '0').slice(0, 100) }
  if (Number.isInteger(code)) return failure(code)
  return { ok: false, error: `HTTP ${httpStatus}: ${body.slice(0, 150)}`, retry: false }
}

/** {"response":"1234.50"} is the balance in taka; a bare known code ("106") is an error. */
export function parseBalanceReply(body: string): number {
  let value: unknown
  try {
    value = (JSON.parse(body) as { response?: unknown } | null)?.response
  } catch {
    // not JSON
  }
  const text = String(value ?? '').trim()
  const n = Number(text)
  if (text === '' || Number.isNaN(n)) throw new Error(`balance: ${body.slice(0, 150)}`)
  if (/^\d+$/.test(text) && CODE_TEXT[n]) throw new Error(`balance: ${failure(n).error}`)
  return n
}

export function automas(apiKey: string, senderId: string): SmsProvider {
  return {
    name: 'automas',
    async send(to, text, unicode) {
      const params = new URLSearchParams({ apikey: apiKey, sender: senderId, msisdn: to, smstext: text })
      if (unicode) {
        // The docs name both for Unicode (Bangla); either one is enough.
        params.set('type', '8')
        params.set('smsformat', '8')
      }
      let res: Response
      try {
        res = await fetch(`${BASE}/smsapiv3`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: params,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch (e) {
        // We cannot tell whether it went out, so no automatic retry (never send twice).
        return { ok: false, error: `network: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200), retry: false }
      }
      return parseSendReply(res.status, await res.text())
    },
    async balance() {
      const res = await fetch(`${BASE}/getbalancev3?${new URLSearchParams({ apikey: apiKey })}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      return parseBalanceReply(await res.text())
    },
  }
}
