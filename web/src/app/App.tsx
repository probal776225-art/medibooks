import { lazy, useEffect, useRef, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { startCatalog, stopCatalog } from '../catalog/store'
import { startSmsOutbox } from '../data/repos/sms'
import { Toaster } from '../components/ui'
import { LoginPage } from '../features/auth/LoginPage'
import { NoAccess } from '../features/auth/NoAccess'
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
import { startRole, stopRole, useIsOwner, useRoleStore } from '../stores/role'
import { Layout } from './Layout'
import { ROUTES } from './routes'

// Screens used now and then load on demand (still precached by the service worker, so they open offline).
const ImportsPage = lazy(() => import('../features/imports/ImportsPage').then((m) => ({ default: m.ImportsPage })))
const MedicineImportPage = lazy(() => import('../features/imports/MedicineImportPage').then((m) => ({ default: m.MedicineImportPage })))
const OpeningImportPage = lazy(() => import('../features/imports/OpeningImportPage').then((m) => ({ default: m.OpeningImportPage })))
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const SmsLogPage = lazy(() => import('../features/sms/SmsLogPage').then((m) => ({ default: m.SmsLogPage })))
const RemindersPage = lazy(() => import('../features/reminders/RemindersPage').then((m) => ({ default: m.RemindersPage })))


/** The owner's tools: staff who open the link land on Home. */
function OwnerOnly({ children }: { children: ReactNode }) {
  const isOwner = useIsOwner()
  return isOwner ? children : <Navigate to={ROUTES.home} replace />
}

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
      { path: ROUTES.imports, element: <OwnerOnly><ImportsPage /></OwnerOnly> },
      { path: ROUTES.importOpening, element: <OwnerOnly><OpeningImportPage /></OwnerOnly> },
      { path: ROUTES.importMedicines, element: <OwnerOnly><MedicineImportPage /></OwnerOnly> },
      { path: ROUTES.settings, element: <SettingsPage /> },
      { path: ROUTES.more, element: <MorePage /> },
      { path: ROUTES.reminders, element: <OwnerOnly><RemindersPage /></OwnerOnly> },
      { path: ROUTES.smsLog, element: <OwnerOnly><SmsLogPage /></OwnerOnly> },
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
  const uid = useAuthStore((s) => s.user?.uid ?? null)
  const role = useRoleStore((s) => s.role)
  const locked = useLockStore((s) => s.locked)
  const prevStatus = useRef(status)

  useEffect(() => initAuth(), [])
  useEffect(() => startIdleWatch(), [])

  // Opening the app with a saved sign-in keeps the PIN lock; signing in with the password opens it.
  useEffect(() => {
    if (prevStatus.current === 'signedOut' && status === 'signedIn') unlockAfterLogin()
    prevStatus.current = status
  }, [status])

  // Owner or staff? (the owner's UID is known at build time; staff have a members record)
  useEffect(() => {
    if (status === 'signedIn' && uid) startRole(uid)
    else if (status === 'signedOut') stopRole()
  }, [status, uid])

  // Realtime listeners and medicine sync only for the owner or an active staff member.
  const allowed = status === 'signedIn' && (role === 'owner' || role === 'staff')
  useEffect(() => {
    if (allowed) {
      startSessionData()
      startCatalog()
    } else {
      stopSessionData()
      stopCatalog()
    }
  }, [allowed])
  // SMS this device queued while offline (or before a reload) go to the Worker once they reach the server.
  useEffect(() => (allowed ? startSmsOutbox() : undefined), [allowed])

  if (status === 'loading') return <Splash />
  if (status === 'signedOut') return <LoginPage />
  if (role === 'loading') return <Splash />
  if (role === 'none' || role === 'disabled') return <NoAccess disabled={role === 'disabled'} />
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
