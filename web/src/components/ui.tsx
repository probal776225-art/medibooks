// Small shared UI pieces. Tap targets ≥ 44px.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useT } from '../i18n'
import { useToastStore } from '../stores/toast'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-300',
  outline: 'border-2 border-teal-700 text-teal-800 hover:bg-teal-50 disabled:border-slate-300 disabled:text-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
  danger: 'border-2 border-rose-600 text-rose-700 hover:bg-rose-50',
}

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:cursor-not-allowed ${VARIANTS[variant]} ${extra}`
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[17px] outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${className}`}
      {...props}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-1 text-left"
    >
      <span className="text-[16px]">{label}</span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>
}

export function Toaster() {
  const t = useT()
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  if (toasts.length === 0) return null
  return (
    <div className="fixed inset-x-3 top-16 z-40 flex flex-col items-center gap-2 md:inset-x-auto md:right-6">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={`w-full max-w-sm rounded-xl px-4 py-3 text-left font-medium shadow-lg ${
            toast.kind === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {t(toast.message)}
        </button>
      ))}
    </div>
  )
}

/** Bottom sheet on phones, centered dialog on PC. Esc or the backdrop closes it. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useT()
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl md:max-w-lg md:rounded-2xl"
      >
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-3 text-slate-600 hover:bg-slate-100">
            {t('med.close')}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
