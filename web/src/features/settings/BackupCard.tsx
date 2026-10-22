// Settings → ব্যাকআপ: download every shop document as JSON (+ a customers CSV for Excel), and restore a
// JSON backup into an empty shop. Both need internet (they must see the server, not this device's cache).
import { useState } from 'react'
import { syncMedicines } from '../../catalog/store'
import { Button, Card, Field, Modal, TextInput } from '../../components/ui'
import { checkRestoreTarget, exportBackup, recordBackupExported, restoreBackup, RestoreError, type RestoreTarget } from '../../data/backup'
import { SHOP_ID } from '../../data/paths'
import { commitInBackground } from '../../data/writer'
import { customersCsv, parseBackup, summarizeBackup, type BackupFile, type BackupSummary } from '../../domain/backup'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { downloadText } from '../../lib/files'
import { useDataStore } from '../../stores/data'
import { useOnline } from '../../stores/sync'
import { inDhaka } from '../../domain/dates'

const CONFIRM_WORD = 'RESTORE'

function RestoreDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const online = useOnline()
  const [backup, setBackup] = useState<BackupFile | null>(null)
  const [summary, setSummary] = useState<BackupSummary | null>(null)
  const [target, setTarget] = useState<RestoreTarget | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [typed, setTyped] = useState('')
  const [progress, setProgress] = useState<{ written: number; total: number } | null>(null)
  const [result, setResult] = useState<'done' | 'quota' | 'failed' | null>(null)

  async function pick(file: File) {
    setError(null)
    setBackup(null)
    setTarget(null)
    const parsed = parseBackup(await file.text(), SHOP_ID)
    if ('problem' in parsed) {
      setError(`backup.problem.${parsed.problem}`)
      return
    }
    setBackup(parsed.backup)
    setSummary(summarizeBackup(parsed.backup))
    try {
      setTarget(await checkRestoreTarget(parsed.backup.backupId))
    } catch {
      setError('backup.needOnline')
    }
  }

  async function run() {
    if (!backup) return
    setResult(null)
    setProgress({ written: 0, total: 1 })
    try {
      await restoreBackup(backup, (written, total) => setProgress({ written, total }))
      setResult('done')
      void syncMedicines()
    } catch (e) {
      if (e instanceof RestoreError && e.reason === 'notEmpty') setTarget('notEmpty')
      setResult(e instanceof RestoreError && e.reason === 'quota' ? 'quota' : 'failed')
    }
  }

  const running = progress !== null && result === null
  const pct = progress ? Math.floor((progress.written / Math.max(progress.total, 1)) * 100) : 0

  return (
    <Modal title={t('backup.restoreTitle')} onClose={() => !running && onClose()}>
      <div className="space-y-3">
        <p className="text-slate-700">{t('backup.restoreIntro')}</p>
        {!online && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('backup.needOnline')}</p>}
        {!progress && (
          <Field label={t('backup.chooseFile')} error={error ? t(error) : null}>
            <input
              type="file"
              accept=".json,application/json"
              disabled={!online}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void pick(file)
              }}
              className="block w-full text-[15px] file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:font-semibold file:text-teal-800"
            />
          </Field>
        )}

        {summary && (
          <div className="rounded-xl bg-slate-50 p-3 text-[15px]">
            <p className="font-semibold">{t('backup.fileFrom', { date: f.dateTime(summary.exportedAt) })}</p>
            <p>
              {t('backup.fileCounts', {
                customers: summary.counts.customers,
                transactions: summary.counts.transactions,
                medicines: summary.counts.medicines,
              })}
            </p>
            <p>
              {t('backup.fileMarket')}: <span className="font-semibold">{f.money(summary.marketDuePaisa)}</span>
            </p>
            {summary.mismatches.length > 0 && (
              <p className="mt-1 text-amber-800">{t('backup.fileMismatch', { count: summary.mismatches.length })}</p>
            )}
          </div>
        )}

        {target === 'notEmpty' && <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t('backup.notEmpty')}</p>}
        {target === 'resume' && !progress && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('backup.resume')}</p>}

        {backup && (target === 'empty' || target === 'resume') && !progress && (
          <>
            <Field label={t('backup.typeToConfirm', { word: CONFIRM_WORD })}>
              <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
            </Field>
            <Button variant="danger" className="w-full" disabled={typed.trim() !== CONFIRM_WORD || !online} onClick={() => void run()}>
              {t('backup.restoreNow')}
            </Button>
          </>
        )}

        {progress && (
          <div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {t('backup.progress', { written: progress.written, total: progress.total })}
            </p>
          </div>
        )}
        {running && <p className="text-sm text-slate-600">{t('backup.keepOpen')}</p>}
        {result === 'done' && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{t('backup.restoreDone')}</p>}
        {result === 'quota' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('backup.restoreQuota')}</p>}
        {result === 'failed' && target !== 'notEmpty' && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t('backup.restoreFailed')}</p>
        )}
        {result && (
          <Button variant="outline" className="w-full" onClick={onClose}>
            {t('med.close')}
          </Button>
        )}
      </div>
    </Modal>
  )
}

export function BackupCard() {
  const t = useT()
  const f = useFormat()
  const online = useOnline()
  const lastExportAt = useDataStore((s) => s.settings.backup.lastExportAt)
  const customers = useDataStore((s) => s.customers)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [restoring, setRestoring] = useState(false)

  async function exportNow() {
    setMessage(null)
    setBusy(t('backup.reading', { count: 0 }))
    try {
      let readSoFar = 0
      const done: Record<string, number> = {}
      const backup = await exportBackup((name, count) => {
        done[name] = count
        readSoFar = Object.values(done).reduce((a, b) => a + b, 0)
        setBusy(t('backup.reading', { count: readSoFar }))
      })
      const day = inDhaka(backup.exportedAt).format('YYYY-MM-DD')
      downloadText(`baki-backup-${day}.json`, JSON.stringify(backup))
      downloadText(`baki-customers-${day}.csv`, customersCsv(customers, (ms) => inDhaka(ms).format('YYYY-MM-DD')))
      commitInBackground(recordBackupExported(backup))
      setMessage({
        kind: 'ok',
        text: t('backup.saved', { customers: backup.counts.customers, transactions: backup.counts.transactions }),
      })
    } catch (e) {
      console.error('Backup failed', e)
      setMessage({ kind: 'error', text: t('backup.exportFailed') })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <h2 id="backup" className="scroll-mt-20 font-semibold">
        {t('settings.backup')}
      </h2>
      <p className="mt-1 text-slate-600">
        {lastExportAt ? t('backup.last', { date: f.dateTime(lastExportAt) }) : t('backup.never')}
      </p>
      <Button className="mt-3 w-full" disabled={!online || busy !== null} onClick={() => void exportNow()}>
        {busy ?? t('backup.export')}
      </Button>
      {!online && <p className="mt-1 text-sm text-amber-700">{t('backup.needOnline')}</p>}
      {message && (
        <p className={`mt-2 rounded-lg px-3 py-2 ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
          {message.text}
        </p>
      )}
      <p className="mt-2 text-sm text-slate-500">{t('backup.hint')}</p>
      <Button variant="ghost" className="mt-2 w-full border border-slate-200" onClick={() => setRestoring(true)}>
        {t('backup.restore')}
      </Button>
      {restoring && <RestoreDialog onClose={() => setRestoring(false)} />}
    </Card>
  )
}
