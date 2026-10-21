import type { NavItem } from '../app/routes'
import { useT } from '../i18n'
import { Icon } from './Icon'

/** Stand-in for screens that later phases build. */
export function PlaceholderPage({ item }: { item: NavItem }) {
  const t = useT()
  return (
    <section>
      <h1 className="text-2xl font-bold">{t(item.label)}</h1>
      <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Icon name={item.icon} className="size-7" />
        </span>
        <p className="mt-4 text-lg font-semibold">{t('placeholder.title')}</p>
        <p className="mt-1 text-slate-500">{t('placeholder.body', { phase: item.phase })}</p>
      </div>
    </section>
  )
}
