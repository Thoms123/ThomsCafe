import { useQueryClient } from '@tanstack/react-query'
import { getWsBaseUrl } from '../lib/axios'
import { useReconnectingSocket } from './useReconnectingSocket'

/**
 * Connects to /ws/order/:id (public, no auth) and writes the pushed order
 * straight into the react-query cache for ['order-status', orderId].
 */
export function useOrderStatusSocket(orderId: string | undefined) {
  const queryClient = useQueryClient()

  const url = orderId ? `${getWsBaseUrl()}/ws/order/${orderId}` : null

  useReconnectingSocket(url, (data) => {
    try {
      const msg = JSON.parse(data)
      if (msg.order) {
        queryClient.setQueryData(['order-status', orderId], msg.order)
      }
    } catch {
      // ignore malformed message
    }
  })
}
