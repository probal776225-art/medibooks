import { useEffect } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { startCatalog, stopCatalog } from '../catalog/store'
import { PlaceholderPage } from '../components/PlaceholderPage'
import { Toaster } from '../components/ui'
import { LoginPage } from '../features/auth/LoginPage'
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { NewCustomerPage } from '../features/customers/NewCustomerPage'
import { HomePage } from '../features/home/HomePage'
import { ImportsPage } from '../features/imports/ImportsPage'
import { MedicineDetailPage } from '../features/medicines/MedicineDetailPage'
import { MedicinesPage } from '../features/medicines/MedicinesPage'
import { MorePage } from '../features/more/MorePage'
import { PaymentPage } from '../features/payment/PaymentPage'
import { NewSalePage } from '../features/sale/NewSalePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { useHtmlLang, useT } from '../i18n'
import { initAuth, useAuthStore } from '../stores/auth'
import { startSessionData, stopSessionData } from '../stores/data'
import { Layout } from './Layout'
import { NAV, ROUTES } from './routes'

const placeholderRoutes = (['reminders', 'reports', 'smsLog'] as const).map(
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
      { path: ROUTES.imports, element: <ImportsPage /> },
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

  useEffect(() => initAuth(), [])

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
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
