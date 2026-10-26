// Shared by the deploy scripts: reads web/.env.deploy.local (never committed).
import { existsSync, readFileSync } from 'node:fs'

export const ENV_FILE = 'web/.env.deploy.local'

export function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

export function readDeployEnv() {
  if (!existsSync(ENV_FILE)) fail(`${ENV_FILE} is missing. Copy the "deploy" part of web/.env.example into it and fill it in.`)
  return Object.fromEntries(
    readFileSync(ENV_FILE, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
}

/** Every Hosting site that serves the app, main link first (default: the project's own site). */
export function hostingSites(env) {
  return (env.HOSTING_SITES || env.VITE_FIREBASE_PROJECT_ID || '').split(',').map((x) => x.trim()).filter(Boolean)
}
