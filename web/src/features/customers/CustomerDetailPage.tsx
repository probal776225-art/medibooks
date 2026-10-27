import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { customerPath, ROUTES } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { Button, buttonClass, Card, Toggle } from '../../components/ui'
import { setCustomerFlags } from '../../data/repos/customers'
import { smsServerConfigured } from '../../data/repos/sms'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { useIsOwner } from '../../stores/role'
import { useToastStore } from '../../stores/toast'
import { ChangeMobileDialog } from './ChangeMobileDialog'
import { CustomerForm } from './CustomerForm'
import { CustomerLedger } from './CustomerLedger'
import { CustomerSummary } from './CustomerSummary'
import { DeleteCustomerDialog } from './DeleteCustomerDialog'
import { PrescriptionSection } from '../prescriptions/PrescriptionSection'
import { StatementDialog } from '../print/StatementDialog'
import { RemindDialog } from '../reminders/RemindDialog'

export function CustomerDetailPage() {
  const t = useT()
  const f = useFormat()
  const navigate = useNavigate()
  const { mobile = '' } = useParams()
  const customer = useDataStore((s) => s.byMobile.get(mobile))
  const status = useDataStore((s) => s.customersStatus)
  const showToast = useToastStore((s) => s.show)
  const [editing, setEditing] = useState(false)
  const [changingMobile, setChangingMobile] = useState(false)
  const [showStatement, setShowStatement] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reminding, setReminding] = useState(false)
  const isOwner = useIsOwner()
  const smsOn = useDataStore((s) => s.settings.sms.enabled)

  if (!customer) {
    return (
      <section className="mx-auto max-w-xl">
        <p className="mt-6 text-center text-slate-500">
          {status === 'ready' ? t('customer.notExist') : t('app.loading')}
        </p>
        <Link to={ROUTES.customers} className={buttonClass('ghost', 'mt-4 w-full')}>
          {t('customer.back')}
        </Link>
      </section>
    )
  }

  const withMobile = (path: string) => `${path}?mobile=${customer.mobile}`

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link to={ROUTES.customers} className="inline-flex min-h-11 items-center gap-1 text-slate-600">
        <Icon name="chevron" className="size-4 rotate-180" /> {t('customer.back')}
      </Link>

      {editing ? (
        <Card>
          <h1 className="mb-3 text-lg font-semibold">
            {t('customer.edit')} · {f.mobile(customer.mobile)}
          </h1>
          <CustomerForm
            mode="edit"
            customer={customer}
            onSaved={(saved) => {
              setEditing(false)
              if (saved === customer.mobile) showToast('success', 'customer.saved')
              else {
                showToast('success', 'mob.done')
                navigate(customerPath(saved), { replace: true })
              }
            }}
            onCancel={() => setEditing(false)}
          />
        </Card>
      ) : (
        <CustomerSummary customer={customer}>
          {isOwner && (
            <Button variant="ghost" className="mt-2 -ml-2" onClick={() => setEditing(true)}>
              {t('customer.edit')}
            </Button>
          )}
        </CustomerSummary>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link to={withMobile(ROUTES.newSale)} className={buttonClass('primary', 'min-h-14 text-lg')}>
          <Icon name="plus" /> {t('customer.giveBaki')}
        </Link>
        <Link to={withMobile(ROUTES.payment)} className={buttonClass('outline', 'min-h-14 text-lg')}>
          <Icon name="wallet" /> {t('customer.takePayment')}
        </Link>
        <a href={`tel:${customer.mobile}`} className={buttonClass('outline', 'min-h-14')}>
          {t('customer.call')}
        </a>
        {isOwner && (
          <Button variant="ghost" className="border border-slate-200" onClick={() => setShowStatement(true)}>
            {t('customer.statement')}
          </Button>
        )}
        {isOwner && (
          <Button
            variant="ghost"
            disabled={!smsServerConfigured || !smsOn || !customer.smsEnabled || customer.totalDuePaisa <= 0}
            className="border border-slate-200"
            onClick={() => setReminding(true)}
          >
            {t('customer.remindNow')}
          </Button>
        )}
      </div>

      {isOwner && (
        <Card className="divide-y divide-slate-100 py-1">
          <Toggle
            label={t('customer.sms')}
            checked={customer.smsEnabled}
            onChange={(v) => setCustomerFlags(customer, { smsEnabled: v })}
          />
          <Toggle
            label={t('customer.reminder')}
            checked={customer.reminderEnabled}
            onChange={(v) => setCustomerFlags(customer, { reminderEnabled: v })}
          />
        </Card>
      )}

      <PrescriptionSection customer={customer} />

      <CustomerLedger customer={customer} />

      {isOwner && !customer.movedTo && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="ghost" className="border border-slate-200" onClick={() => setChangingMobile(true)}>
            {t('mob.change')}
          </Button>
          <Button
            variant="ghost"
            className="border border-slate-200"
            onClick={() => setCustomerFlags(customer, { archived: !customer.archived })}
          >
            {customer.archived ? t('customer.unarchive') : t('customer.archive')}
          </Button>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            {t('customer.delete')}
          </Button>
        </div>
      )}
      {deleting && <DeleteCustomerDialog customer={customer} onClose={() => setDeleting(false)} />}
      {reminding && <RemindDialog customers={[customer]} onClose={() => setReminding(false)} />}
      {changingMobile && <ChangeMobileDialog customer={customer} onClose={() => setChangingMobile(false)} />}
      {showStatement && <StatementDialog customer={customer} onClose={() => setShowStatement(false)} />}
    </section>
  )
}
