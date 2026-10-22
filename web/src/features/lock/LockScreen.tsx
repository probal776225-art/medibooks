// Full-screen PIN pad shown over the app while it is locked. The app stays mounted underneath
// (hidden), so a half-written bill is still there after unlocking.
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { cleanPin } from '../../domain/pin'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { forgetPinAndSignOut, unlockWithPin, useLockStore } from '../../stores/lock'
import { usePendingCount } from '../../stores/sync'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

function useSecondsLeft(until: number): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (until <= now) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [until, now])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

function ForgotPin({ onBack }: { onBack: () => void }) {
  const t = useT()
  const pending = usePendingCount()
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-3 text-left">
      <h2 className="text-lg font-semibold">{t('lock.forgotTitle')}</h2>
      <p className="text-slate-700">{t('lock.forgotText')}</p>
      {pending > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('lock.forgotPending', { count: pending })}</p>
      )}
      <Button
        variant="danger"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void forgetPinAndSignOut()
        }}
      >
        {t('lock.forgotConfirm')}
      </Button>
      <Button variant="ghost" className="w-full" onClick={onBack}>
        {t('lock.back')}
      </Button>
    </div>
  )
}

export function LockScreen() {
  const t = useT()
  const f = useFormat()
  const shopName = useDataStore((s) => s.settings.shop.name)
  const blockedUntil = useLockStore((s) => s.blockedUntil)
  const length = useLockStore((s) => s.pinLength)
  const [pin, setPin] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(false)
  const [forgot, setForgot] = useState(false)
  const secondsLeft = useSecondsLeft(blockedUntil)
  const blocked = secondsLeft > 0

  const submit = useCallback(async (value: string) => {
    setChecking(true)
    const result = await unlockWithPin(value)
    setChecking(false)
    if (result !== 'ok') {
      setPin('')
      setError(result === 'wrong')
    }
  }, [])

  const press = useCallback(
    (key: string) => {
      if (checking || blocked) return
      setError(false)
      if (key === 'del') {
        setPin(pin.slice(0, -1))
        return
      }
      const next = cleanPin(pin + key)
      if (next.length > length) return
      setPin(next)
      if (next.length === length) void submit(next)
    },
    [checking, blocked, length, pin, submit],
  )

  // PC: type the digits, Backspace to correct.
  useEffect(() => {
    if (forgot) return
    const onKey = (e: KeyboardEvent) => {
      const digit = cleanPin(e.key)
      if (digit.length === 1) press(digit)
      else if (e.key === 'Backspace') press('del')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, forgot])

  return (
    <main
      role="dialog"
      aria-modal="true"
      aria-label={t('lock.title')}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-50 px-4 py-8"
    >
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-700 text-white">
          <Icon name="lock" className="size-7" />
        </div>
        <p className="mt-3 text-xl font-bold text-teal-800">{t('app.name')}</p>
        <p className="text-sm text-slate-500">{shopName}</p>

        {forgot ? (
          <div className="mt-6">
            <ForgotPin onBack={() => setForgot(false)} />
          </div>
        ) : (
          <>
            <p className="mt-6 text-lg font-semibold">{t('lock.title')}</p>
            <div className="mt-3 flex justify-center gap-3" aria-live="polite" aria-label={t('lock.typed', { count: pin.length })}>
              {Array.from({ length }, (_, i) => (
                <span
                  key={i}
                  className={`size-4 rounded-full border-2 ${i < pin.length ? 'border-teal-700 bg-teal-700' : 'border-slate-400'}`}
                />
              ))}
            </div>
            <p role="alert" className="mt-3 min-h-6 text-[15px] text-rose-700">
              {blocked ? t('lock.blocked', { seconds: secondsLeft }) : error ? t('lock.wrong') : ''}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {KEYS.map((key, i) =>
                key === '' ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={checking || blocked}
                    onClick={() => press(key)}
                    aria-label={key === 'del' ? t('lock.delete') : undefined}
                    className="min-h-16 rounded-2xl border border-slate-200 bg-white text-2xl font-semibold text-slate-800 shadow-sm active:bg-teal-50 disabled:opacity-50"
                  >
                    {key === 'del' ? '⌫' : f.num(Number(key))}
                  </button>
                ),
              )}
            </div>
            <button type="button" onClick={() => setForgot(true)} className="mt-5 min-h-11 px-3 text-teal-800 underline">
              {t('lock.forgot')}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
