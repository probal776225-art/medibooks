import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useT } from '../i18n'
import { useDataStore } from '../stores/data'
import { useOnline, usePendingCount } from '../stores/sync'
import { useUiStore } from '../stores/ui'
import { ReloadPrompt } from './ReloadPrompt'
import { useIsStaff, useRoleStore } from '../stores/role'
import { NAV, ROUTES, SIDEBAR, STAFF_HIDDEN, type NavItem } from './routes'
import { useShortcuts } from './useShortcuts'

function Header() {
  const t = useT()
  const online = useOnline()
  const pending = usePendingCount()
  const toggleLanguage = useUiStore((s) => s.toggleLanguage)
  const shopName = useDataStore((s) => s.settings.shop.name)
  const staffName = useRoleStore((s) => (s.role === 'staff' ? s.name : ''))

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="min-w-0 flex-1">
        <div className="text-lg font-bold leading-tight text-teal-800">{t('app.name')}</div>
        <div className="truncate text-xs leading-tight text-slate-500">
          {shopName}
          {staffName && <span className="ml-1 font-medium text-teal-700">· {t('staff.badge', { name: staffName })}</span>}
        </div>
      </div>
      {pending > 0 && (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          {t('status.pending', { count: pending })}
        </span>
      )}
      <span className="flex items-center gap-1.5 text-sm text-slate-600" role="status">
        <span className={`size-2.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden="true" />
        <span className="hidden sm:inline">{online ? t('status.online') : t('status.offline')}</span>
      </span>
      <button
        type="button"
        onClick={toggleLanguage}
        className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {t('lang.switchTo')}
      </button>
    </header>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const t = useT()
  return (
    <NavLink
      to={ROUTES[item.id]}
      end={item.id === 'home'}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium ${
          isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-100'
        }`
      }
    >
      <Icon name={item.icon} className="size-5" />
      {t(item.label)}
    </NavLink>
  )
}

function Sidebar() {
  const t = useT()
  const isStaff = useIsStaff()
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {SIDEBAR.filter((item) => !isStaff || !STAFF_HIDDEN.includes(item.id)).map((item) => (
          <SidebarLink key={item.id} item={item} />
        ))}
      </nav>
      <p className="px-4 pb-4 text-xs text-slate-400">{t('shortcut.hint')}</p>
    </aside>
  )
}

function BottomNav() {
  const t = useT()
  const isStaff = useIsStaff()
  const tab = (item: NavItem) => (
    <NavLink
      key={item.id}
      to={ROUTES[item.id]}
      end={item.id === 'home'}
      className={({ isActive }) =>
        `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
          isActive ? 'text-teal-700' : 'text-slate-500'
        }`
      }
    >
      <Icon name={item.icon} className="size-6" />
      {t(item.label)}
    </NavLink>
  )

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-end border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {tab(NAV.home)}
      {tab(NAV.customers)}
      <NavLink
        to={ROUTES.newSale}
        className="-mt-6 flex flex-1 flex-col items-center gap-0.5 pb-1.5 text-xs font-semibold text-teal-800"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg ring-4 ring-white">
          <Icon name="plus" className="size-7" />
        </span>
        {t('nav.newSale')}
      </NavLink>
      {isStaff ? tab(NAV.reports) : tab(NAV.reminders)}
      <NavLink
        to={ROUTES.more}
        className={({ isActive }) =>
          `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
            isActive ? 'text-teal-700' : 'text-slate-500'
          }`
        }
      >
        <Icon name="more" className="size-6" />
        {t('nav.more')}
      </NavLink>
    </nav>
  )
}

export function Layout() {
  const t = useT()
  useShortcuts()
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pt-4 pb-28 md:px-8 md:pb-8">
          <Suspense fallback={<p className="py-10 text-center text-slate-500">{t('app.loading')}</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
      <ReloadPrompt />
    </div>
  )
}
