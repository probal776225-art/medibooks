import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLockStore } from '../stores/lock'
import { ROUTES } from './routes'

/** PC keyboard shortcuts (SPEC §1). More are added with their screens. */
export function useShortcuts(): void {
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useLockStore.getState().locked) return
      if (e.key === 'F2') {
        e.preventDefault()
        navigate(ROUTES.newSale)
      } else if (e.key === 'F4') {
        e.preventDefault()
        navigate(ROUTES.payment)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}
