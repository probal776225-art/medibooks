// Signed in, but not the owner and not an active staff member: nothing to show except a way out.
import { Button } from '../../components/ui'
import { useT } from '../../i18n'
import { signOut } from '../../stores/auth'

export function NoAccess({ disabled }: { disabled: boolean }) {
  const t = useT()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-xl font-bold text-teal-800">{t('app.name')}</p>
        <p className="mt-3 text-slate-700">{t(disabled ? 'staff.disabledText' : 'staff.noAccessText')}</p>
        <Button variant="danger" className="mt-4 w-full" onClick={() => void signOut()}>
          {t('settings.logout')}
        </Button>
      </div>
    </main>
  )
}
