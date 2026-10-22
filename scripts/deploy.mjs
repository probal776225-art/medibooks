// Deploy to the REAL Firebase project (Hosting + Firestore rules + indexes). Run from the project root:
//   npm run deploy                       → hosting, rules, indexes
//   npm run deploy -- --only hosting     → just the app
// Needs web/.env.deploy.local (see web/.env.example) and `npx firebase login` once on this computer.
// firestore.rules in the repo keeps the emulator's placeholder UID; the owner's real UID is put in a
// generated copy (.deploy/firestore.rules) only for the deploy.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const PLACEHOLDER = 'REPLACE_WITH_OWNER_UID'
const ENV_FILE = 'web/.env.deploy.local'

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

if (!existsSync(ENV_FILE)) fail(`${ENV_FILE} is missing. Copy the "deploy" part of web/.env.example into it and fill it in.`)
const env = Object.fromEntries(
  readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const projectId = env.VITE_FIREBASE_PROJECT_ID ?? ''
for (const key of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID', 'OWNER_UID']) {
  if (!env[key]) fail(`${key} is empty in ${ENV_FILE}.`)
}
if (projectId.startsWith('demo-')) fail(`${projectId} is the emulator project, not a real one.`)
if (env.VITE_USE_EMULATOR !== 'false') fail(`Set VITE_USE_EMULATOR=false in ${ENV_FILE}.`)
if (!/^[A-Za-z0-9]{20,128}$/.test(env.OWNER_UID) || env.OWNER_UID === PLACEHOLDER) {
  fail(`OWNER_UID in ${ENV_FILE} does not look like a Firebase user UID (Authentication → Users → User UID).`)
}

// Rules with the owner's UID.
const rules = readFileSync('firestore.rules', 'utf8')
if (rules.split(PLACEHOLDER).length !== 2) fail(`firestore.rules must contain ${PLACEHOLDER} exactly once.`)
mkdirSync('.deploy', { recursive: true })
writeFileSync('.deploy/firestore.rules', rules.replace(PLACEHOLDER, env.OWNER_UID))

// Same config as firebase.json, pointed at the generated rules and the deploy build, without the emulator block.
const config = JSON.parse(readFileSync('firebase.json', 'utf8'))
config.firestore.rules = '.deploy/firestore.rules'
config.hosting.public = 'web/dist-deploy'
delete config.emulators
writeFileSync('firebase.deploy.json', `${JSON.stringify(config, null, 2)}\n`)

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' })
console.log(`\n→ Building the app for ${projectId} …`)
run('npm', ['--prefix', 'web', 'run', 'build:deploy'])

const passed = process.argv.slice(2)
const only = passed.length ? passed : ['--only', 'hosting,firestore:rules,firestore:indexes']
console.log(`\n→ Deploying to ${projectId} …`)
run('npx', ['firebase', 'deploy', '--config', 'firebase.deploy.json', '--project', projectId, ...only])
console.log(`\n✓ Done. The app: https://${projectId}.web.app\n`)
