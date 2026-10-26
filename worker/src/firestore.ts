// Minimal Firestore REST client (v1) for the Worker. Timestamps are read as epoch milliseconds, like the app's
// domain types; write a timestamp with `ts(ms)`. Docs: https://firebase.google.com/docs/firestore/reference/rest

export type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { bytesValue: string }
  | { referenceValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } }

/** A timestamp to write (plain numbers are written as integers). */
export class Ts {
  readonly ms: number
  constructor(ms: number) {
    this.ms = ms
  }
}
export const ts = (ms: number) => new Ts(ms)

export function toValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (v instanceof Ts) return { timestampValue: new Date(v.ms).toISOString() }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  if (typeof v === 'object') return { mapValue: { fields: toFields(v as Record<string, unknown>) } }
  throw new TypeError(`Cannot write ${typeof v} to Firestore`)
}

export function toFields(obj: Record<string, unknown>): Record<string, FsValue> {
  const out: Record<string, FsValue> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = toValue(v)
  return out
}

export function fromValue(v: FsValue): unknown {
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return Date.parse(v.timestampValue)
  if ('stringValue' in v) return v.stringValue
  if ('bytesValue' in v) return v.bytesValue
  if ('referenceValue' in v) return v.referenceValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromValue)
  return fromFields(v.mapValue.fields ?? {})
}

export function fromFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) out[k] = fromValue(v)
  return out
}

export interface FsDoc {
  /** Path below the database root, e.g. "shops/main/smsQueue/abc". */
  path: string
  id: string
  data: Record<string, unknown>
  /** For preconditions ("only if nobody changed it since I read it"). */
  updateTime: string
}

interface RawDoc {
  name: string
  fields?: Record<string, FsValue>
  updateTime: string
}

export interface WriteOptions {
  /** Fields to replace (dotted for nested map fields); default = the top-level keys of `fields`. */
  mask?: string[]
  /** Precondition: the document still has this updateTime. */
  updateTime?: string
  /** Precondition: create only (fails if the document exists). */
  mustNotExist?: boolean
  /** Precondition: update only (never creates a missing document). */
  mustExist?: boolean
  /** Fields set to the server's time. */
  serverTime?: string[]
  /** Fields changed with increment(n). */
  increment?: Record<string, number>
}

export interface Write {
  path: string
  fields: Record<string, unknown>
  opts: WriteOptions
}

export const update = (path: string, fields: Record<string, unknown>, opts: WriteOptions = {}): Write => ({ path, fields, opts })
export const create = (path: string, fields: Record<string, unknown>, opts: Omit<WriteOptions, 'mustNotExist'> = {}): Write => ({
  path,
  fields,
  opts: { ...opts, mask: undefined, mustNotExist: true },
})

/** One write's result in a batchWrite (writes there succeed or fail one by one). */
export interface WriteResult {
  ok: boolean
  /** gRPC status code; 9 = FAILED_PRECONDITION (somebody else changed it first). */
  code: number
  message: string
}

const AUTO_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** A 20-character id like the SDKs make. */
export function autoId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return Array.from(bytes, (b) => AUTO_ID_CHARS[b % AUTO_ID_CHARS.length]).join('')
}

export interface FirestoreConfig {
  projectId: string
  /** "127.0.0.1:8080" for the emulator; otherwise the real service is used. */
  emulatorHost?: string
  /** OAuth access token for the service account (ignored by the emulator). */
  token: () => Promise<string>
  /** Counts every outgoing request (Cloudflare caps subrequests per run). */
  onRequest?: () => void
}

export class Firestore {
  private readonly cfg: FirestoreConfig
  private readonly root: string
  private readonly base: string

  constructor(cfg: FirestoreConfig) {
    this.cfg = cfg
    this.root = `projects/${cfg.projectId}/databases/(default)/documents`
    this.base = cfg.emulatorHost ? `http://${cfg.emulatorHost}/v1` : 'https://firestore.googleapis.com/v1'
  }

  private name(path: string): string {
    return `${this.root}/${path}`
  }

  private toDoc(raw: RawDoc): FsDoc {
    const path = raw.name.slice(this.root.length + 1)
    return { path, id: path.slice(path.lastIndexOf('/') + 1), data: fromFields(raw.fields ?? {}), updateTime: raw.updateTime }
  }

  private async call<T>(method: string, url: string, body?: unknown): Promise<T> {
    this.cfg.onRequest?.()
    // The emulator treats "owner" as an admin token (rules are skipped, like for a service account).
    const token = this.cfg.emulatorHost ? 'owner' : await this.cfg.token()
    const res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (res.status === 404 && method === 'GET') return null as T
    if (!res.ok) throw new Error(`Firestore ${method} ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return (await res.json()) as T
  }

  async get(path: string): Promise<FsDoc | null> {
    const raw = await this.call<RawDoc | null>('GET', `${this.base}/${this.name(path)}`)
    return raw ? this.toDoc(raw) : null
  }

  /** Several documents in one request; missing ones come back as null, in the same order. */
  async getMany(paths: string[]): Promise<(FsDoc | null)[]> {
    if (paths.length === 0) return []
    const res = await this.call<{ found?: RawDoc; missing?: string }[]>('POST', `${this.base}/${this.root}:batchGet`, {
      documents: paths.map((p) => this.name(p)),
    })
    const byPath = new Map<string, FsDoc>()
    for (const r of res) if (r.found) {
      const d = this.toDoc(r.found)
      byPath.set(d.path, d)
    }
    return paths.map((p) => byPath.get(p) ?? null)
  }

  /** structuredQuery against a collection under `parent` (e.g. "shops/main"). */
  async query(parent: string, structuredQuery: Record<string, unknown>): Promise<FsDoc[]> {
    const res = await this.call<{ document?: RawDoc }[]>('POST', `${this.base}/${this.name(parent)}:runQuery`, {
      structuredQuery,
    })
    return res.flatMap((r) => (r.document ? [this.toDoc(r.document)] : []))
  }

  private encode(w: Write): Record<string, unknown> {
    const { opts } = w
    const transforms = [
      ...(opts.serverTime ?? []).map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })),
      ...Object.entries(opts.increment ?? {}).map(([fieldPath, n]) => ({ fieldPath, increment: toValue(n) })),
    ]
    return {
      update: { name: this.name(w.path), fields: toFields(w.fields) },
      ...(opts.mustNotExist ? {} : { updateMask: { fieldPaths: opts.mask ?? Object.keys(w.fields) } }),
      ...(transforms.length ? { updateTransforms: transforms } : {}),
      ...(opts.updateTime
        ? { currentDocument: { updateTime: opts.updateTime } }
        : opts.mustNotExist || opts.mustExist
          ? { currentDocument: { exists: !opts.mustNotExist } }
          : {}),
    }
  }

  /** All writes or none (max 500). */
  async commit(writes: Write[]): Promise<void> {
    if (writes.length === 0) return
    await this.call('POST', `${this.base}/${this.root}:commit`, { writes: writes.map((w) => this.encode(w)) })
  }

  /** Each write on its own; a failed precondition fails only that write. */
  async batchWrite(writes: Write[]): Promise<WriteResult[]> {
    if (writes.length === 0) return []
    const res = await this.call<{ status?: { code?: number; message?: string }[] }>(
      'POST',
      `${this.base}/${this.root}:batchWrite`,
      { writes: writes.map((w) => this.encode(w)) },
    )
    return writes.map((_, i) => {
      const s = res.status?.[i] ?? {}
      const code = s.code ?? 0
      return { ok: code === 0, code, message: s.message ?? '' }
    })
  }
}
