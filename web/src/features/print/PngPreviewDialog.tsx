// Shows the generated PNG first, then lets the owner share it (WhatsApp etc.) or save it.
import { useEffect, useState, type ReactElement } from 'react'
import { Button, Modal } from '../../components/ui'
import { canShareFile, downloadFile, shareFile } from '../../lib/share'
import { useT } from '../../i18n'

export function PngPreviewDialog({
  title,
  fileName,
  image,
  onClose,
}: {
  title: string
  fileName: string
  /** The element to draw (a template from this folder). */
  image: ReactElement
  onClose: () => void
}) {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    import('../../lib/png')
      .then(({ renderToPng }) => renderToPng(image))
      .then((blob) => {
        if (!alive) return
        const f = new File([blob], fileName, { type: 'image/png' })
        objectUrl = URL.createObjectURL(f)
        setFile(f)
        setUrl(objectUrl)
      })
      .catch((e: unknown) => {
        console.error('PNG failed', e)
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // The image is drawn once when the dialog opens.
  }, [])

  return (
    <Modal title={title} onClose={onClose}>
      {failed ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t('print.failed')}</p>
      ) : !url || !file ? (
        <p className="py-10 text-center text-slate-500">{t('print.making')}</p>
      ) : (
        <>
          <img src={url} alt={title} className="mx-auto max-h-[60dvh] w-auto rounded-lg border border-slate-200 shadow-sm" />
          <p className="mt-1 text-center font-mono text-xs text-slate-500">{file.name}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {canShareFile(file) && (
              <Button className="text-lg" onClick={() => void shareFile(file, title)}>
                {t('print.share')}
              </Button>
            )}
            <Button variant="outline" onClick={() => downloadFile(file)}>
              {t('print.save')}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
