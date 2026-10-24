// Customer page → প্রেসক্রিপশন: take or pick a photo (shrunk on the device), a thumbnail gallery, full view.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Field, Modal, TextInput } from '../../components/ui'
import { addPrescription, subscribePrescriptions } from '../../data/repos/prescriptions'
import { formatBytes, NOTE_MAX, type Prescription } from '../../domain/prescriptions'
import type { Customer } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { jpegUrl, PhotoTooBigError, shrinkPhoto, type ShrunkPhoto } from '../../lib/imageShrink'
import { useToastStore } from '../../stores/toast'
import { PrescriptionViewer } from './PrescriptionViewer'

function AddPhotoDialog({ photo, onSave, onClose }: { photo: ShrunkPhoto; onSave: (note: string) => void; onClose: () => void }) {
  const t = useT()
  const [note, setNote] = useState('')
  const url = useMemo(() => jpegUrl(photo.image), [photo])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <Modal title={t('rx.addTitle')} onClose={onClose}>
      <img src={url} alt={t('rx.addTitle')} className="mx-auto max-h-[50dvh] w-auto max-w-full rounded-lg border border-slate-200" />
      <p className="mt-1 text-center text-xs text-slate-500">{t('rx.size', { size: formatBytes(photo.image.length) })}</p>
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(note)
        }}
      >
        <Field label={t('rx.note')}>
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX} autoComplete="off" />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {t('rx.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('customer.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function PrescriptionSection({ customer }: { customer: Customer }) {
  const t = useT()
  const f = useFormat()
  const showToast = useToastStore((s) => s.show)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [list, setList] = useState<Prescription[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [shrinking, setShrinking] = useState(false)
  const [adding, setAdding] = useState<ShrunkPhoto | null>(null)
  const [open, setOpen] = useState<Prescription | null>(null)

  useEffect(() => {
    setList(null)
    return subscribePrescriptions(customer.mobile, setList, (e) => {
      console.error('Prescriptions listener failed', e)
      setFailed(true)
    })
  }, [customer.mobile])

  const thumbs = useMemo(() => new Map((list ?? []).map((p) => [p.id, jpegUrl(p.thumb)])), [list])
  useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [thumbs])

  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setShrinking(true)
    try {
      setAdding(await shrinkPhoto(file))
    } catch (e) {
      console.error('Photo could not be read', e)
      showToast('error', e instanceof PhotoTooBigError ? 'rx.tooBig' : 'rx.readFailed')
    } finally {
      setShrinking(false)
    }
  }

  return (
    <Card>
      <div className="flex items-baseline gap-2">
        <h2 className="flex-1 font-semibold">{t('rx.title')}</h2>
        {list && list.length > 0 && <span className="text-sm text-slate-500">{t('rx.count', { count: list.length })}</span>}
      </div>

      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onFile(e.target)} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target)} data-testid="rx-file" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button disabled={shrinking} onClick={() => camera.current?.click()}>
          {t('rx.camera')}
        </Button>
        <Button variant="outline" disabled={shrinking} onClick={() => gallery.current?.click()}>
          {t('rx.gallery')}
        </Button>
      </div>
      {shrinking && <p className="mt-2 text-sm text-slate-500">{t('rx.shrinking')}</p>}

      {failed ? (
        <p className="mt-3 text-sm text-rose-700">{t('rx.loadFailed')}</p>
      ) : list === null ? (
        <p className="mt-3 text-sm text-slate-500">{t('app.loading')}</p>
      ) : list.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{t('rx.empty')}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(p)} className="block w-full text-left">
                <img
                  src={thumbs.get(p.id)}
                  alt={p.note || t('rx.addTitle')}
                  className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                />
                <span className="mt-0.5 block truncate text-xs text-slate-600">{f.date(p.createdAt)}</span>
                {p.note && <span className="block truncate text-xs text-slate-500">{p.note}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddPhotoDialog
          photo={adding}
          onClose={() => setAdding(null)}
          onSave={(note) => {
            addPrescription(customer.mobile, { ...adding, note })
            setAdding(null)
            showToast('success', 'rx.saved')
          }}
        />
      )}
      {open && <PrescriptionViewer item={open} onClose={() => setOpen(null)} />}
    </Card>
  )
}
