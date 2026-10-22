import { lazy, useEffect, useRef } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { startCatalog, stopCatalog } from '../catalog/store'
import { PlaceholderPage } from '../components/PlaceholderPage'
import { Toaster } from '../components/ui'
import { LoginPage } from '../features/auth/LoginPage'
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { NewCustomerPage } from '../features/customers/NewCustomerPage'
import { HomePage } from '../features/home/HomePage'
import { LockScreen } from '../features/lock/LockScreen'
import { MedicineDetailPage } from '../features/medicines/MedicineDetailPage'
import { MedicinesPage } from '../features/medicines/MedicinesPage'
import { MorePage } from '../features/more/MorePage'
import { PaymentPage } from '../features/payment/PaymentPage'
import { NewSalePage } from '../features/sale/NewSalePage'
import { useHtmlLang, useT } from '../i18n'
import { initAuth, useAuthStore } from '../stores/auth'
import { startSessionData, stopSessionData } from '../stores/data'
import { startIdleWatch, unlockAfterLogin, useLockStore } from '../stores/lock'
import { Layout } from './Layout'
import { NAV, ROUTES } from './routes'

// Screens used now and then load on demand (still precached by the service worker, so they open offline).
const ImportsPage = lazy(() => import('../features/imports/ImportsPage').then((m) => ({ default: m.ImportsPage })))
const MedicineImportPage = lazy(() => import('../features/imports/MedicineImportPage').then((m) => ({ default: m.MedicineImportPage })))
const OpeningImportPage = lazy(() => import('../features/imports/OpeningImportPage').then((m) => ({ default: m.OpeningImportPage })))
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const placeholderRoutes = (['reminders', 'smsLog'] as const).map(
  (id) => ({ path: ROUTES[id], element: <PlaceholderPage item={NAV[id]} /> }),
)

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: ROUTES.home, element: <HomePage /> },
      { path: ROUTES.customers, element: <CustomersPage /> },
      { path: ROUTES.customerNew, element: <NewCustomerPage /> },
      { path: '/customers/:mobile', element: <CustomerDetailPage /> },
      { path: ROUTES.newSale, element: <NewSalePage /> },
      { path: ROUTES.payment, element: <PaymentPage /> },
      { path: ROUTES.medicines, element: <MedicinesPage /> },
      { path: '/medicines/:id', element: <MedicineDetailPage /> },
      { path: ROUTES.reports, element: <ReportsPage /> },
      { path: ROUTES.imports, element: <ImportsPage /> },
      { path: ROUTES.importOpening, element: <OpeningImportPage /> },
      { path: ROUTES.importMedicines, element: <MedicineImportPage /> },
      { path: ROUTES.settings, element: <SettingsPage /> },
      { path: ROUTES.more, element: <MorePage /> },
      ...placeholderRoutes,
      { path: '*', element: <Navigate to={ROUTES.home} replace /> },
    ],
  },
])

function Splash() {
  const t = useT()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">{t('app.loading')}</main>
  )
}

export function App() {
  useHtmlLang()
  const status = useAuthStore((s) => s.status)
  const locked = useLockStore((s) => s.locked)
  const prevStatus = useRef(status)

  useEffect(() => initAuth(), [])
  useEffect(() => startIdleWatch(), [])

  // Opening the app with a saved sign-in keeps the PIN lock; signing in with the password opens it.
  useEffect(() => {
    if (prevStatus.current === 'signedOut' && status === 'signedIn') unlockAfterLogin()
    prevStatus.current = status
  }, [status])

  // Realtime listeners and medicine sync only while signed in.
  useEffect(() => {
    if (status === 'signedIn') {
      startSessionData()
      startCatalog()
    } else if (status === 'signedOut') {
      stopSessionData()
      stopCatalog()
    }
  }, [status])

  if (status === 'loading') return <Splash />
  if (status === 'signedOut') return <LoginPage />
  return (
    <>
      {/* Hidden (not unmounted) while locked: drafts and scroll positions survive. */}
      <div className={locked ? 'invisible' : undefined} aria-hidden={locked || undefined}>
        <RouterProvider router={router} />
        <Toaster />
      </div>
      {locked && <LockScreen />}
    </>
  )
}
