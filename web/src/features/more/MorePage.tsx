import { Link } from 'react-router-dom'
import { MORE_ITEMS, ROUTES, STAFF_HIDDEN } from '../../app/routes'
import { useIsStaff } from '../../stores/role'
import { Icon } from '../../components/Icon'
import { useT } from '../../i18n'

/** Mobile "আরও" menu; on PC the sidebar shows these directly. */
export function MorePage() {
  const t = useT()
  const isStaff = useIsStaff()
  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">{t('nav.more')}</h1>
      <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {MORE_ITEMS.filter((item) => !isStaff || !STAFF_HIDDEN.includes(item.id)).map((item) => (
          <li key={item.id}>
            <Link to={ROUTES[item.id]} className="flex min-h-14 items-center gap-3 px-4 text-[17px] hover:bg-slate-50">
              <Icon name={item.icon} className="size-6 text-teal-700" />
              <span className="flex-1">{t(item.label)}</span>
              <Icon name="chevron" className="size-5 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
