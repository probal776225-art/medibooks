// Weekly backup reminder on the home screen (SPEC §12). "পরে" hides it on this device until tomorrow.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { BACKUP_REMIND_DAYS, daysSinceBackup } from '../../domain/backup'
import { inDhaka } from '../../domain/dates'
import { useT } from '../../i18n'
import { useDataStore } from '../../stores/data'

const SNOOZE_KEY = 'baki.backupSnooze'

function snoozedToday(): boolean {
  try {
    return localStorage.getItem(SNOOZE_KEY) === inDhaka(Date.now()).format('YYYY-MM-DD')
  } catch {
    return false
  }
}

export function BackupReminder() {
  const t = useT()
  const ready = useDataStore((s) => s.settingsStatus === 'ready' && s.customers.length > 0)
  const lastExportAt = useDataStore((s) => s.settings.backup.lastExportAt)
  const [snoozed, setSnoozed] = useState(snoozedToday)

  const days = daysSinceBackup(lastExportAt, Date.now())
  if (!ready || snoozed || (days !== null && days < BACKUP_REMIND_DAYS)) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="min-w-0 flex-1 text-amber-900">{days === null ? t('backup.remindNever') : t('backup.remindDays', { days })}</p>
      <Link
        to={`${ROUTES.settings}#backup`}
        className="flex min-h-11 items-center rounded-xl bg-amber-600 px-4 font-semibold text-white hover:bg-amber-700"
      >
        {t('backup.remindGo')}
      </Link>
      <button
        type="button"
        className="min-h-11 rounded-xl px-3 text-amber-900 hover:bg-amber-100"
        onClick={() => {
          try {
            localStorage.setItem(SNOOZE_KEY, inDhaka(Date.now()).format('YYYY-MM-DD'))
          } catch {
            // Hidden for this visit only.
          }
          setSnoozed(true)
        }}
      >
        {t('backup.remindLater')}
      </button>
    </div>
  )
}
