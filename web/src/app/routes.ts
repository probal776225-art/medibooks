import type { IconName } from '../components/Icon'
import type { MessageKey } from '../i18n'

export const ROUTES = {
  home: '/',
  customers: '/customers',
  customerNew: '/customers/new',
  newSale: '/sale/new',
  payment: '/payment/new',
  reminders: '/reminders',
  more: '/more',
  reports: '/reports',
  smsLog: '/sms-log',
  medicines: '/medicines',
  imports: '/imports',
  importOpening: '/imports/opening',
  importMedicines: '/imports/medicines',
  settings: '/settings',
} as const

export type RouteId = keyof typeof ROUTES

export const customerPath = (mobile: string) => `/customers/${mobile}`
export const medicinePath = (id: string) => `/medicines/${id}`

export interface NavItem {
  id: RouteId
  label: MessageKey
  icon: IconName
}

export const NAV: Record<Exclude<RouteId, 'more' | 'customerNew' | 'importOpening' | 'importMedicines'>, NavItem> = {
  home: { id: 'home', label: 'nav.home', icon: 'home' },
  customers: { id: 'customers', label: 'nav.customers', icon: 'users' },
  newSale: { id: 'newSale', label: 'nav.newSale', icon: 'plus' },
  payment: { id: 'payment', label: 'nav.payment', icon: 'wallet' },
  reminders: { id: 'reminders', label: 'nav.reminders', icon: 'bell' },
  reports: { id: 'reports', label: 'nav.reports', icon: 'chart' },
  smsLog: { id: 'smsLog', label: 'nav.smsLog', icon: 'message' },
  medicines: { id: 'medicines', label: 'nav.medicines', icon: 'pill' },
  imports: { id: 'imports', label: 'nav.imports', icon: 'upload' },
  settings: { id: 'settings', label: 'nav.settings', icon: 'settings' },
}

/** PC sidebar order. */
export const SIDEBAR: NavItem[] = [
  NAV.home,
  NAV.customers,
  NAV.newSale,
  NAV.payment,
  NAV.reminders,
  NAV.reports,
  NAV.smsLog,
  NAV.medicines,
  NAV.imports,
  NAV.settings,
]

/** Screens a staff member does not get (the owner's tools). */
export const STAFF_HIDDEN: readonly RouteId[] = ['reminders', 'smsLog', 'imports', 'importOpening', 'importMedicines']

/** Items on the mobile "আরও" page. */
export const MORE_ITEMS: NavItem[] = [NAV.payment, NAV.reports, NAV.smsLog, NAV.medicines, NAV.imports, NAV.settings]
