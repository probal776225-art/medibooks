// MediBooks Worker: POST /sms/process (the app's "send these now"), GET /sms/balance (owner), GET /health,
// and a cron every 10 minutes for the queue sweep and the daily reminders.
import { authenticate, HttpError } from './auth'
import { makeContext } from './context'
import { isEmulator, type Env } from './env'
import { processIds, sweep } from './queue'
import { runReminderJob } from './reminders'

const ID = /^[A-Za-z0-9]{1,40}$/

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  return allowed.includes(origin)
    ? {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '86400',
        vary: 'origin',
      }
    : {}
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'content-type': 'application/json' } })
}

async function route(req: Request, env: Env): Promise<unknown> {
  const { pathname } = new URL(req.url)
  if (req.method === 'GET' && pathname === '/health') {
    return { ok: true, emulator: isEmulator(env), provider: isEmulator(env) ? 'fake' : env.SMS_PROVIDER }
  }
  const run = makeContext(env)
  if (req.method === 'POST' && pathname === '/sms/process') {
    await authenticate(req, env, run.fs)
    const body = (await req.json().catch(() => null)) as { ids?: unknown } | null
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === 'string' && ID.test(id)) : []
    if (ids.length === 0 || ids.length > 100) throw new HttpError(400, 'ids: 1 to 100 queue ids')
    return { results: await processIds(ids, run) }
  }
  if (req.method === 'GET' && pathname === '/sms/balance') {
    const caller = await authenticate(req, env, run.fs)
    if (caller.role !== 'owner') throw new HttpError(403, 'owner only')
    const provider = run.provider()
    if (!provider.balance) throw new HttpError(501, 'balance not supported')
    return { balance: await provider.balance(), provider: provider.name }
  }
  throw new HttpError(404, 'not found')
}

async function runCron(env: Env): Promise<void> {
  const run = makeContext(env)
  try {
    const ids = await runReminderJob(run)
    if (ids.length) {
      const results = await processIds(ids, run)
      console.log(`reminders: ${ids.length} queued, ${results.length} handled now`)
    }
  } catch (e) {
    console.error('reminder job failed', e)
  }
  try {
    const r = await sweep(run)
    if (r.processed || r.stuck) console.log(`sweep: ${r.processed} handled, ${r.stuck} stuck`)
  } catch (e) {
    console.error('sweep failed', e)
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = cors(req, env)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    try {
      return json(await route(req, env), 200, headers)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status, headers)
      console.error(e)
      return json({ error: e instanceof Error ? e.message : 'error' }, 500, headers)
    }
  },
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(env))
  },
} satisfies ExportedHandler<Env>
