import { FirebaseError } from 'firebase/app'
import { useState, type FormEvent } from 'react'
import { Button, Field, TextInput } from '../../components/ui'
import { usingEmulator } from '../../data/firebase'
import { useT, type MessageKey } from '../../i18n'
import { signIn } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'

function loginError(e: unknown): MessageKey {
  if (!(e instanceof FirebaseError)) return 'login.failed'
  switch (e.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'login.wrong'
    case 'auth/network-request-failed':
      return 'login.network'
    case 'auth/too-many-requests':
      return 'login.tooMany'
    default:
      return 'login.failed'
  }
}

export function LoginPage() {
  const t = useT()
  const toggleLanguage = useUiStore((s) => s.toggleLanguage)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(loginError(err))
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-teal-700 text-4xl font-bold text-white">
            +
          </div>
          <h1 className="mt-3 text-2xl font-bold text-teal-800">{t('app.name')}</h1>
          <p className="text-sm text-slate-500">{t('app.shop')}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t('login.title')}</h2>
          <Field label={t('login.email')}>
            <TextInput
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t('login.password')}>
            <TextInput
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {t(error)}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full text-lg">
            {busy ? t('login.working') : t('login.submit')}
          </Button>
          {usingEmulator && <p className="text-center text-xs text-amber-700">{t('login.emulator')}</p>}
        </form>
        <div className="mt-4 text-center">
          <button type="button" onClick={toggleLanguage} className="min-h-11 px-3 text-sm text-slate-600 underline">
            {t('lang.switchTo')}
          </button>
        </div>
      </div>
    </main>
  )
}
