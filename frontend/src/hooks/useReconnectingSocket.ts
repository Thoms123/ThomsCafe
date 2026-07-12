import { useEffect, useRef } from 'react'

const INITIAL_DELAY = 1000
const MAX_DELAY = 30000

/**
 * Opens a native WebSocket to `url` and keeps it alive with exponential
 * backoff reconnects. Pass `url: null` to stay disconnected (e.g. no auth
 * token yet) — the effect closes any existing socket and does not reconnect.
 */
export function useReconnectingSocket(url: string | null, onMessage: (data: string) => void) {
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    if (!url) return

    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let delay = INITIAL_DELAY
    let stopped = false

    function connect() {
      socket = new WebSocket(url!)

      socket.onopen = () => {
        delay = INITIAL_DELAY
      }
      socket.onmessage = (e) => onMessageRef.current(e.data)
      socket.onclose = () => {
        if (stopped) return
        reconnectTimer = setTimeout(connect, delay)
        delay = Math.min(delay * 2, MAX_DELAY)
      }
      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [url])
}
