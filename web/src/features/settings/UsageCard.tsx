// Settings → জায়গা: how much of the free Firestore space the prescription photos use (one read of stats/usage).
import { useEffect, useState } from 'react'
import { Card } from '../../components/ui'
import { fetchPhotoUsage, type PhotoUsage } from '../../data/repos/prescriptions'
import { formatBytes, FREE_STORAGE_BYTES } from '../../domain/prescriptions'
import { useT } from '../../i18n'

export function UsageCard() {
  const t = useT()
  const [usage, setUsage] = useState<PhotoUsage | null>(null)
  useEffect(() => {
    fetchPhotoUsage()
      .then(setUsage)
      .catch(() => setUsage(null))
  }, [])
  if (!usage) return null
  const pct = Math.round((usage.bytes / FREE_STORAGE_BYTES) * 1000) / 10
  return (
    <Card>
      <h2 className="font-semibold">{t('usage.title')}</h2>
      <p className="mt-1 text-slate-700">{t('usage.photos', { count: usage.count, size: formatBytes(usage.bytes) })}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className={`h-full ${pct >= 70 ? 'bg-amber-500' : 'bg-teal-600'}`} style={{ width: `${Math.min(100, Math.max(pct, 0.5))}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-500">{t('usage.hint', { pct })}</p>
      {pct >= 70 && <p className="mt-1 text-sm text-amber-800">{t('usage.warn')}</p>}
    </Card>
  )
}
