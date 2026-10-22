// Settings → নিরাপত্তা: this device's PIN lock (set / change / remove) and the idle time.
import { useState, type FormEvent } from 'react'
import { Button, Card, Field, Modal, TextInput } from '../../components/ui'
import { cleanPin, IDLE_MINUTE_CHOICES, isValidPin } from '../../domain/pin'
import { useT, type MessageKey } from '../../i18n'
import { checkPin, lockNow, removePin, setIdleMinutes, setPin, useLockStore } from '../../stores/lock'

type Mode = 'set' | 'change' | 'remove'
type Step = 'current' | 'new' | 'confirm'

function PinDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const t = useT()
  const [step, setStep] = useState<Step>(mode === 'set' ? 'new' : 'current')
  const [value, setValue] = useState('')
  const [first, setFirst] = useState('')
  const [error, setError] = useState<MessageKey | null>(null)
  const [busy, setBusy] = useState(false)

  const title = t(mode === 'set' ? 'pin.setTitle' : mode === 'change' ? 'pin.changeTitle' : 'pin.removeTitle')
  const label = t(step === 'current' ? 'pin.current' : step === 'new' ? 'pin.new' : 'pin.confirm')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (step === 'current') {
      setBusy(true)
      const result = await checkPin(value)
      setBusy(false)
      setValue('')
      if (result !== 'ok') {
        setError(result === 'blocked' ? 'pin.blocked' : 'pin.wrong')
        return
      }
      if (mode === 'remove') {
        removePin()
        onClose()
      } else setStep('new')
    } else if (step === 'new') {
      if (!isValidPin(value)) {
        setError('pin.invalid')
        return
      }
      setFirst(value)
      setValue('')
      setStep('confirm')
    } else {
      if (value !== first) {
        setError('pin.mismatch')
        setValue('')
        setStep('new')
        return
      }
      setBusy(true)
      await setPin(value)
      onClose()
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <Field label={label} hint={step === 'new' ? t('pin.hint') : undefined} error={error ? t(error) : null}>
          <TextInput
            key={step}
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={value}
            onChange={(e) => setValue(cleanPin(e.target.value))}
            className="text-center text-2xl tracking-[0.5em]"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy || value.length < 4}>
          {step === 'current' && mode === 'remove' ? t('pin.removeConfirm') : t('pin.next')}
        </Button>
      </form>
    </Modal>
  )
}

export function SecurityCard() {
  const t = useT()
  const hasPin = useLockStore((s) => s.hasPin)
  const idleMinutes = useLockStore((s) => s.idleMinutes)
  const [dialog, setDialog] = useState<Mode | null>(null)

  return (
    <Card>
      <h2 className="font-semibold">{t('settings.security')}</h2>
      <p className="mt-1 text-slate-600">{t(hasPin ? 'pin.on' : 'pin.off')}</p>

      {hasPin ? (
        <>
          <p className="mt-3 text-sm font-medium text-slate-700">{t('pin.idle')}</p>
          <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={t('pin.idle')}>
            {IDLE_MINUTE_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={idleMinutes === m}
                onClick={() => setIdleMinutes(m)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                  idleMinutes === m ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {t('pin.minutes', { count: m })}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button onClick={lockNow}>{t('pin.lockNow')}</Button>
            <Button variant="outline" onClick={() => setDialog('change')}>
              {t('pin.change')}
            </Button>
            <Button variant="danger" onClick={() => setDialog('remove')}>
              {t('pin.remove')}
            </Button>
          </div>
        </>
      ) : (
        <Button className="mt-3" onClick={() => setDialog('set')}>
          {t('pin.set')}
        </Button>
      )}
      <p className="mt-3 text-sm text-slate-500">{t('pin.note')}</p>
      {dialog && <PinDialog mode={dialog} onClose={() => setDialog(null)} />}
    </Card>
  )
}
