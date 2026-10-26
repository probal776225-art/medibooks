// Who is calling? The app sends its Firebase ID token; the Worker checks Google's signature and then whether the
// user is the owner or an active staff member (members/{uid}, the same test the security rules use).
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
import { isEmulator, type Env } from './env'
import type { Firestore } from './firestore'

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export type Caller = { uid: string; role: 'owner' | 'staff' }

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function verifyIdToken(token: string, env: Env): Promise<string> {
  if (isEmulator(env)) {
    // The Auth emulator signs nothing ("alg": "none"); accepted only in emulator mode.
    const payload = decodeJwt(token)
    if (payload.aud !== env.PROJECT_ID || typeof payload.sub !== 'string') throw new HttpError(401, 'bad token')
    return payload.sub
  }
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${env.PROJECT_ID}`,
      audience: env.PROJECT_ID,
    })
    if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('no uid')
    return payload.sub
  } catch {
    throw new HttpError(401, 'bad token')
  }
}

export async function authenticate(req: Request, env: Env, fs: Firestore): Promise<Caller> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new HttpError(401, 'sign in first')
  const uid = await verifyIdToken(token, env)
  if (uid === env.OWNER_UID) return { uid, role: 'owner' }
  const member = await fs.get(`shops/main/members/${uid}`)
  if (member?.data.role === 'staff' && member.data.active === true) return { uid, role: 'staff' }
  throw new HttpError(403, 'not allowed')
}
