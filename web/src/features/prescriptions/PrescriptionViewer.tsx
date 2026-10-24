// Full prescription photo: loads on demand (cache first), tap to zoom, share/save, delete with a confirm.
import { useEffect, useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { deletePrescription, fetchPrescriptionImage } from '../../data/repos/prescriptions'
import { inDhaka } from '../../domain/dates'
import type { Prescription } from '../../domain/prescriptions'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { jpegBlob } from '../../lib/imageShrink'
import { canShareFile, downloadFile, shareFile } from '../../lib/share'
import { useIsOwner } from '../../stores/role'
import { useToastStore } from '../../stores/toast'

export function PrescriptionViewer({ item, onClose }: { item: Prescription; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const showToast = useToastStore((s) => s.show)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [zoomed, setZoomed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const isOwner = useIsOwner()

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    fetchPrescriptionImage(item.id)
      .then((bytes) => {
        if (!alive) return
        if (!bytes) return setState('missing')
        const name = `prescription-${item.customerId}-${inDhaka(item.createdAt).format('YYYY-MM-DD')}.jpg`
        const jpg = new File([jpegBlob(bytes)], name, { type: 'image/jpeg' })
        objectUrl = URL.createObjectURL(jpg)
        setFile(jpg)
        setUrl(objectUrl)
        setState('ready')
      })
      .catch(() => alive && setState('missing'))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [item.id, item.customerId, item.createdAt])

  return (
    <Modal title={`${t('rx.addTitle')} · ${f.dateTime(item.createdAt)}`} onClose={onClose}>
      {item.note && <p className="mb-2 text-slate-700">{item.note}</p>}
      {state === 'loading' && <p className="py-10 text-center text-slate-500">{t('rx.loading')}</p>}
      {state === 'missing' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('rx.offline')}</p>}
      {state === 'ready' && url && file && (
        <>
          <div className={`rounded-lg border border-slate-200 bg-slate-50 ${zoomed ? 'max-h-[70dvh] overflow-auto' : ''}`}>
            <button type="button" className="block w-full" onClick={() => setZoomed((z) => !z)} aria-label={t('rx.zoomHint')}>
              <img
                src={url}
                alt={t('rx.addTitle')}
                className={zoomed ? 'max-w-none' : 'mx-auto max-h-[60dvh] w-auto max-w-full'}
                style={zoomed ? { width: item.width } : undefined}
              />
            </button>
          </div>
          <p className="mt-1 text-center text-xs text-slate-500">{t('rx.zoomHint')}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {canShareFile(file) && (
              <Button onClick={() => void shareFile(file, t('rx.addTitle'))}>{t('print.share')}</Button>
            )}
            <Button variant="outline" onClick={() => downloadFile(file)}>
              {t('print.save')}
            </Button>
          </div>
        </>
      )}

      {isOwner && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {confirming ? (
            <div className="space-y-2">
              <p className="text-rose-700">{t('rx.deleteConfirm')}</p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    deletePrescription(item)
                    showToast('success', 'rx.deleted')
                    onClose()
                  }}
                >
                  {t('rx.deleteYes')}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  {t('customer.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="text-rose-700" onClick={() => setConfirming(true)}>
              {t('rx.delete')}
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}
