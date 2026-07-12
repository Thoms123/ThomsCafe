import * as ToastPrimitive from '@radix-ui/react-toast'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { useToastStore } from '../../store/toastStore'

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className="app-toast"
          onOpenChange={(open) => {
            if (!open) dismiss(t.id)
          }}
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${t.variant === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {t.variant === 'success' ? (
            <CheckCircle2 size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
          ) : (
            <XCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
          )}
          <ToastPrimitive.Description style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
            {t.description}
          </ToastPrimitive.Description>
          <ToastPrimitive.Close
            aria-label="Tutup"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
          >
            <X size={14} />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: 340,
          maxWidth: '90vw',
          zIndex: 200,
          listStyle: 'none',
          margin: 0,
          padding: 0,
          outline: 'none',
        }}
      />
    </ToastPrimitive.Provider>
  )
}
