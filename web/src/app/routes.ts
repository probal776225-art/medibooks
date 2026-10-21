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
  settings: '/settings',
} as const

export type RouteId = keyof typeof ROUTES

export const customerPath = (mobile: string) => `/customers/${mobile}`
export const medicinePath = (id: string) => `/medicines/${id}`

export interface NavItem {
  id: RouteId
  label: MessageKey
  icon: IconName
  /** Build phase that delivers the screen (shown on placeholders). */
  phase: number
}

export const NAV: Record<Exclude<RouteId, 'more' | 'customerNew'>, NavItem> = {
  home: { id: 'home', label: 'nav.home', icon: 'home', phase: 9 },
  customers: { id: 'customers', label: 'nav.customers', icon: 'users', phase: 2 },
  newSale: { id: 'newSale', label: 'nav.newSale', icon: 'plus', phase: 4 },
  payment: { id: 'payment', label: 'nav.payment', icon: 'wallet', phase: 5 },
  reminders: { id: 'reminders', label: 'nav.reminders', icon: 'bell', phase: 8 },
  reports: { id: 'reports', label: 'nav.reports', icon: 'chart', phase: 9 },
  smsLog: { id: 'smsLog', label: 'nav.smsLog', icon: 'message', phase: 7 },
  medicines: { id: 'medicines', label: 'nav.medicines', icon: 'pill', phase: 3 },
  imports: { id: 'imports', label: 'nav.imports', icon: 'upload', phase: 6 },
  settings: { id: 'settings', label: 'nav.settings', icon: 'settings', phase: 11 },
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

/** Items on the mobile "আরও" page. */
export const MORE_ITEMS: NavItem[] = [NAV.payment, NAV.reports, NAV.smsLog, NAV.medicines, NAV.imports, NAV.settings]
