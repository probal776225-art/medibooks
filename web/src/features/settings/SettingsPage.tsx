import { Button, Card } from '../../components/ui'
import { useT } from '../../i18n'
import { signOut, useAuthStore } from '../../stores/auth'
import { useDataStore } from '../../stores/data'
import { BalanceCheckCard } from './BalanceCheckCard'

/** Phase 2: shop details (read-only) + sign out. The full settings screen comes in Phase 11. */
export function SettingsPage() {
  const t = useT()
  const email = useAuthStore((s) => s.user?.email)
  const settings = useDataStore((s) => s.settings)
  const status = useDataStore((s) => s.settingsStatus)

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>

      <Card>
        <h2 className="font-semibold">{t('settings.shop')}</h2>
        {status === 'loading' && <p className="mt-1 text-sm text-slate-500">{t('settings.syncing')}</p>}
        <dl className="mt-2 space-y-1 text-[16px]">
          <dd className="font-semibold">{settings.shop.name}</dd>
          <dd>{settings.shop.address}</dd>
          <dd>{settings.shop.phone}</dd>
          <dd className="text-slate-500">SMS: {settings.shop.smsShortName}</dd>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold">{t('settings.account')}</h2>
        <p className="mt-1 text-slate-600">
          {t('settings.signedInAs')}: <span className="font-medium">{email}</span>
        </p>
        <Button variant="danger" className="mt-3" onClick={() => void signOut()}>
          {t('settings.logout')}
        </Button>
      </Card>

      <BalanceCheckCard />

      <p className="text-sm text-slate-500">{t('settings.more')}</p>
    </section>
  )
}
