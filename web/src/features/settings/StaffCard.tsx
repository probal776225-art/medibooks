// Settings → স্টাফ (owner): add a staff login, turn staff off/on, send a password-reset email.
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card, Field, Modal, TextInput, Toggle } from '../../components/ui'
import { createStaff, sendStaffPasswordReset, setStaffActive, StaffError, subscribeMembers, type Member } from '../../data/repos/members'
import { useT, type MessageKey } from '../../i18n'
import { useOnline } from '../../stores/sync'
import { useToastStore } from '../../stores/toast'

function AddStaffDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const online = useOnline()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState<MessageKey | null>(null)
  const [busy, setBusy] = useState(false)
  const showToast = useToastStore((s) => s.show)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError('staff.err.name')
    if (form.password.length < 8) return setError('staff.err.weakPassword')
    setBusy(true)
    try {
      await createStaff(form)
      showToast('success', 'staff.added')
      onClose()
    } catch (err) {
      setError(err instanceof StaffError ? `staff.err.${err.reason}` : 'staff.err.failed')
      setBusy(false)
    }
  }

  return (
    <Modal title={t('staff.addTitle')} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <Field label={t('staff.name')}>
          <TextInput value={form.name} onChange={set('name')} maxLength={60} autoComplete="off" />
        </Field>
        <Field label={t('staff.email')}>
          <TextInput type="email" value={form.email} onChange={set('email')} autoComplete="off" required />
        </Field>
        <Field label={t('staff.password')} hint={t('staff.passwordHint')} error={error ? t(error) : null}>
          <TextInput type="text" value={form.password} onChange={set('password')} autoComplete="new-password" required />
        </Field>
        {!online && <p className="text-sm text-amber-700">{t('backup.needOnline')}</p>}
        <Button type="submit" className="w-full" disabled={busy || !online}>
          {busy ? t('staff.adding') : t('staff.add')}
        </Button>
      </form>
    </Modal>
  )
}

export function StaffCard() {
  const t = useT()
  const showToast = useToastStore((s) => s.show)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [adding, setAdding] = useState(false)
  useEffect(() => subscribeMembers(setMembers, () => setMembers([])), [])

  return (
    <Card>
      <div className="flex items-center gap-3">
        <h2 className="flex-1 font-semibold">{t('staff.title')}</h2>
        <Button variant="outline" className="min-h-10 text-sm" onClick={() => setAdding(true)}>
          + {t('staff.addShort')}
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate-500">{t('staff.explain')}</p>
      {members === null ? (
        <p className="mt-2 text-sm text-slate-500">{t('app.loading')}</p>
      ) : members.length === 0 ? (
        <p className="mt-2 text-slate-600">{t('staff.none')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.uid} className="py-2">
              <Toggle label={`${m.name} · ${m.email}`} checked={m.active} onChange={(v) => setStaffActive(m, v)} />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={m.active ? 'text-emerald-700' : 'text-slate-500'}>{m.active ? t('staff.on') : t('staff.off')}</span>
                <button
                  type="button"
                  className="min-h-9 text-teal-700 underline"
                  onClick={() =>
                    void sendStaffPasswordReset(m.email)
                      .then(() => showToast('success', 'staff.resetSent'))
                      .catch(() => showToast('error', 'staff.err.failed'))
                  }
                >
                  {t('staff.reset')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding && <AddStaffDialog onClose={() => setAdding(false)} />}
    </Card>
  )
}
