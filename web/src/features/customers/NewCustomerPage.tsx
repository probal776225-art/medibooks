import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { customerPath } from '../../app/routes'
import { buttonClass } from '../../components/ui'
import { useT } from '../../i18n'
import { useToastStore } from '../../stores/toast'
import { CustomerSummary } from './CustomerSummary'
import { MobileLookup } from './MobileLookup'

export function NewCustomerPage() {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const showToast = useToastStore((s) => s.show)

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">{t('customer.new')}</h1>
      <MobileLookup
        initialMobile={params.get('mobile') ?? ''}
        renderFound={(c) => (
          <CustomerSummary customer={c}>
            <p className="mt-3 text-sm font-medium text-teal-800">{t('customer.found')}</p>
            <Link to={customerPath(c.mobile)} className={buttonClass('outline', 'mt-2 w-full')}>
              {t('customer.open')}
            </Link>
          </CustomerSummary>
        )}
        onCreated={(mobile) => {
          showToast('success', 'customer.saved')
          navigate(customerPath(mobile), { replace: true })
        }}
      />
    </section>
  )
}
