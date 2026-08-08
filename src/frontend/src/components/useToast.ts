import { useContext } from 'react'
import { ToastContext } from './toast-context'

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast braucht einen ToastProvider darüber.')
  return show
}
