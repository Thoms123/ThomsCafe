// Constrains customer-facing pages to a phone-width column, centered with letterboxing
// on wider screens — otherwise the QR-ordering pages stretch edge-to-edge on a laptop.
export default function PageFrame({
  children,
  background = '#fff',
  outerBackground = '#e5e5e5',
}: {
  children: React.ReactNode
  background?: string
  outerBackground?: string
}) {
  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: outerBackground }}>
      <div className="w-full max-w-md min-h-screen relative sm:shadow-xl" style={{ background }}>
        {children}
      </div>
    </div>
  )
}
