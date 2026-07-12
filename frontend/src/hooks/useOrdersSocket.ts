import { useQueryClient } from '@tanstack/react-query'
import { getWsBaseUrl } from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import { useReconnectingSocket } from './useReconnectingSocket'

/**
 * Connects to /ws/orders (kasir/staff broadcast) and invalidates the order
 * queries on every event, replacing tight polling with WS-driven refresh.
 * Mount this once near the dashboard layout root, not per-page.
 */
export function useOrdersSocket() {
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()

  const url = token ? `${getWsBaseUrl()}/ws/orders?token=${encodeURIComponent(token)}` : null

  useReconnectingSocket(url, () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['orders-pending-count'] })
  })
}
