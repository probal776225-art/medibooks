// ব্যালেন্স যাচাই (SPEC §6): recompute each customer's due from non-voided transactions; repair with increment(diff).
import { useState } from 'react'
import { Button, Card } from '../../components/ui'
import { fetchAllTransactions, repairBalances } from '../../data/repos/transactions'
import { findBalanceMismatches, type BalanceMismatch } from '../../domain/ledger'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'

type State =
  | { step: 'idle' }
  | { step: 'running'; count: number }
  | { step: 'done'; mismatches: BalanceMismatch[]; customers: number; txns: number; fixed: boolean }
  | { step: 'offline' }

export function BalanceCheckCard() {
  const t = useT()
  const f = useFormat()
  const customers = useDataStore((s) => s.customers)
  const [state, setState] = useState<State>({ step: 'idle' })

  async function run() {
    setState({ step: 'running', count: 0 })
    try {
      const txns = await fetchAllTransactions((count) => setState({ step: 'running', count }))
      // Customers come from the live listener; compare against what the server has now.
      const current = useDataStore.getState().customers
      setState({
        step: 'done',
        mismatches: findBalanceMismatches(current, txns),
        customers: current.length,
        txns: txns.length,
        fixed: false,
      })
    } catch (e) {
      console.warn('Balance check failed', e)
      setState({ step: 'offline' })
    }
  }

  function fix(mismatches: BalanceMismatch[]) {
    repairBalances(mismatches)
    setState((s) => (s.step === 'done' ? { ...s, fixed: true } : s))
  }

  return (
    <Card>
      <h2 className="font-semibold">{t('check.title')}</h2>
      <p className="mt-1 text-[15px] text-slate-600">{t('check.body')}</p>

      {state.step === 'running' && <p className="mt-3 text-slate-600">{t('check.running', { count: state.count })}</p>}
      {state.step === 'offline' && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('check.offline')}</p>}

      {state.step === 'done' &&
        (state.mismatches.length === 0 ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
            {t('check.ok', { customers: state.customers, txns: state.txns })}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="font-medium text-rose-700">{t('check.found', { count: state.mismatches.length })}</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[15px]">
              {state.mismatches.map((m) => (
                <li key={m.customerId} className="px-3 py-2">
                  <p className="font-medium">
                    {m.name} · <span className="font-normal text-slate-500">{f.mobile(m.customerId)}</span>
                  </p>
                  <p className="text-slate-600">
                    {t('check.row', { stored: f.money(m.storedPaisa), expected: f.money(m.expectedPaisa) })}
                  </p>
                </li>
              ))}
            </ul>
            {state.fixed ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{t('check.fixed')}</p>
            ) : (
              <Button variant="danger" onClick={() => fix(state.mismatches)}>
                {t('check.fix')}
              </Button>
            )}
          </div>
        ))}

      {state.step !== 'running' && (
        <Button variant="outline" className="mt-3" disabled={customers.length === 0} onClick={() => void run()}>
          {t('check.run')}
        </Button>
      )}
    </Card>
  )
}
