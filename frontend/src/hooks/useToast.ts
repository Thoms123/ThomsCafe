import { useToastStore } from '../store/toastStore'

export function useToast() {
  const push = useToastStore((s) => s.push)
  return {
    success: (description: string) => push(description, 'success'),
    error: (description: string) => push(description, 'error'),
  }
}
