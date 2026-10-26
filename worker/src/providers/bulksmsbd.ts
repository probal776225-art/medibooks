// bulksmsbd.net HTTP API (owner's account, non-masking sender id).
// Send: POST https://bulksmsbd.net/api/smsapi with api_key, type (text | unicode), number, senderid, message.
// Balance: POST https://bulksmsbd.net/api/getBalanceApi with api_key.
// Reply: JSON with response_code (202 = submitted) and success_message / error_message.
// The account's IP whitelist must be turned off: Cloudflare Workers have no fixed IP.
import type { SendResult, SmsProvider } from './types'

const BASE = 'https://bulksmsbd.net/api'
const TIMEOUT_MS = 15_000

/** Codes worth another try later (nothing was sent). Everything else is permanent. */
const RETRY_CODES = new Set([1005, 1006, 1007, 1023, 1028])

const CODE_TEXT: Record<number, string> = {
  1001: 'Invalid number',
  1002: 'Sender ID not correct or disabled',
  1003: 'Required fields missing',
  1005: 'Provider internal error',
  1006: 'Balance validity not available',
  1007: 'Insufficient balance',
  1011: 'User ID not found',
  1012: 'Masking SMS must be in Bangla',
  1013: 'Sender ID has no gateway for this API key',
  1031: 'Account not verified',
  1032: 'IP not whitelisted (turn the IP whitelist off in bulksmsbd)',
}

/** 01XXXXXXXXX → 8801XXXXXXXXX */
export function toProviderNumber(mobile: string): string {
  return `88${mobile}`
}

export function parseSendReply(httpStatus: number, body: string): SendResult {
  let json: Record<string, unknown> | null = null
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object') json = parsed as Record<string, unknown>
  } catch {
    // not JSON
  }
  const code = Number(json?.response_code ?? json?.code ?? NaN)
  if (code === 202) {
    const ref = json?.message_id ?? json?.messageId ?? json?.success_message ?? '202'
    return { ok: true, ref: String(ref).slice(0, 100) }
  }
  if (!Number.isNaN(code)) {
    const text = String(json?.error_message || json?.success_message || CODE_TEXT[code] || '')
    return { ok: false, error: `${code} ${text}`.trim().slice(0, 200), retry: RETRY_CODES.has(code) }
  }
  return { ok: false, error: `HTTP ${httpStatus}: ${body.slice(0, 150)}`, retry: false }
}

export function bulkSmsBd(apiKey: string, senderId: string): SmsProvider {
  return {
    name: 'bulksmsbd',
    async send(to, text, unicode) {
      let res: Response
      try {
        res = await fetch(`${BASE}/smsapi`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            api_key: apiKey,
            type: unicode ? 'unicode' : 'text',
            number: toProviderNumber(to),
            senderid: senderId,
            message: text,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch (e) {
        // We cannot tell whether it went out, so no automatic retry (never send twice).
        return { ok: false, error: `network: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200), retry: false }
      }
      return parseSendReply(res.status, await res.text())
    },
    async balance() {
      const res = await fetch(`${BASE}/getBalanceApi`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ api_key: apiKey }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const body = await res.text()
      const json = JSON.parse(body) as { balance?: unknown; response_code?: unknown; error_message?: unknown }
      const value = Number(json.balance)
      if (Number.isNaN(value)) throw new Error(`balance: ${body.slice(0, 150)}`)
      return value
    },
  }
}
