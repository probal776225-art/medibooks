import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../i18n'

/** "নতুন ভার্সন এসেছে" prompt + one-time "works offline" notice. */
export function ReloadPrompt() {
  const t = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-36 z-30 rounded-xl border border-slate-200 bg-white p-4 shadow-xl md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
    >
      {needRefresh ? (
        <>
          <p className="font-semibold">{t('pwa.updateTitle')}</p>
          <p className="mt-1 text-sm text-slate-600">{t('pwa.updateBody')}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg px-4 text-slate-600 hover:bg-slate-100"
              onClick={() => setNeedRefresh(false)}
            >
              {t('pwa.later')}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800"
              onClick={() => void updateServiceWorker(true)}
            >
              {t('pwa.reload')}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm">{t('pwa.offlineReady')}</p>
          <button
            type="button"
            className="min-h-11 rounded-lg bg-teal-700 px-4 font-semibold text-white"
            onClick={() => setOfflineReady(false)}
          >
            {t('pwa.ok')}
          </button>
        </div>
      )}
    </div>
  )
}
