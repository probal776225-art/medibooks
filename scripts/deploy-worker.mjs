// Deploy the SMS Worker (Phase 7–8) to Cloudflare. Run from the project root: npm run deploy:worker
// Needs `npx wrangler login` once (in worker/), and in web/.env.deploy.local: VITE_FIREBASE_PROJECT_ID, OWNER_UID,
// SMS_SENDER_ID (and HOSTING_SITES, CUSTOM_DOMAINS). The secrets SMS_API_KEY and SERVICE_ACCOUNT_JSON are set once with
// `wrangler secret put` (docs/RUNBOOK.md §10) and are never in a file here.
// worker/wrangler.toml stays the local-development config (emulator + fake SMS); this writes a copy with the real
// project and provider to .deploy/wrangler.json (gitignored) and deploys that.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ENV_FILE, fail, hostingSites, readDeployEnv } from './deploy-env.mjs'

const env = readDeployEnv()
const projectId = env.VITE_FIREBASE_PROJECT_ID ?? ''
if (!projectId || projectId.startsWith('demo-')) fail(`VITE_FIREBASE_PROJECT_ID in ${ENV_FILE} must be the real project.`)
if (!/^[A-Za-z0-9]{20,128}$/.test(env.OWNER_UID ?? '') || env.OWNER_UID === 'REPLACE_WITH_OWNER_UID') {
  fail(`OWNER_UID in ${ENV_FILE} does not look like a Firebase user UID.`)
}
if (!env.SMS_SENDER_ID) fail(`SMS_SENDER_ID is empty in ${ENV_FILE} (the SMS provider's sender id / number).`)

const toml = readFileSync('worker/wrangler.toml', 'utf8')
const pick = (key) => {
  const m = new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm').exec(toml)
  if (!m) fail(`worker/wrangler.toml has no ${key}.`)
  return m[1]
}
const crons = /^crons\s*=\s*(\[.*\])/m.exec(toml)
if (!crons) fail('worker/wrangler.toml has no crons.')

// The app's own domains (CUSTOM_DOMAINS=msallopathic.store,…) too, with and without www.
const customDomains = (env.CUSTOM_DOMAINS ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
const origins = [
  ...hostingSites(env).flatMap((s) => [`https://${s}.web.app`, `https://${s}.firebaseapp.com`]),
  ...customDomains.flatMap((d) => [`https://${d}`, `https://www.${d}`]),
]
const config = {
  name: pick('name'),
  main: '../worker/src/index.ts',
  compatibility_date: pick('compatibility_date'),
  workers_dev: true,
  triggers: { crons: JSON.parse(crons[1]) },
  vars: {
    PROJECT_ID: projectId,
    OWNER_UID: env.OWNER_UID,
    SMS_PROVIDER: 'bulksmsbd',
    SMS_SENDER_ID: env.SMS_SENDER_ID,
    ALLOWED_ORIGINS: origins.join(','),
  },
}
mkdirSync('.deploy', { recursive: true })
writeFileSync('.deploy/wrangler.json', `${JSON.stringify(config, null, 2)}\n`)

const extra = process.argv.slice(2) // e.g. --dry-run
console.log(`\n→ Deploying the SMS Worker "${config.name}" for ${projectId} …`)
execFileSync('npx', ['wrangler', 'deploy', '--config', '../.deploy/wrangler.json', ...extra], { cwd: 'worker', stdio: 'inherit' })
if (extra.includes('--dry-run')) process.exit(0)
console.log(`
✓ Worker deployed. Next (once): in worker/ run
    npx wrangler secret put SMS_API_KEY --name ${config.name}
    npx wrangler secret put SERVICE_ACCOUNT_JSON --name ${config.name} < <service account .json file>
  then put its workers.dev URL (printed above) in ${ENV_FILE} as VITE_WORKER_URL and run npm run deploy.
`)
