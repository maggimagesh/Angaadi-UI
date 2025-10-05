import { useEffect, type ReactNode } from 'react'

interface BaseModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'small' | 'medium' | 'large'
  testIdPrefix?: string
  showCloseButton?: boolean
}

const sizeStyles = {
  small: { minWidth: 420, maxWidth: '90vw' },
  medium: { minWidth: 520, maxWidth: '90vw' },
  large: { minWidth: 700, maxWidth: '90vw' }
}

export function BaseModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  testIdPrefix = 'modal',
  showCloseButton = true
}: BaseModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${testIdPrefix}-title`}
      id={`${testIdPrefix}-modal`}
      data-testid={`${testIdPrefix}-modal`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="card modal-surface"
        data-testid={`${testIdPrefix}-content`}
        style={{
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          padding: 0,
          ...sizeStyles[size],
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elev-3)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--color-surface)',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <h3
            id={`${testIdPrefix}-title`}
            data-testid={`${testIdPrefix}-title`}
            style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}
          >
            {title}
          </h3>
          {showCloseButton && (
            <button
              id={`${testIdPrefix}-close`}
              data-testid={`${testIdPrefix}-close`}
              aria-label="Close"
              onClick={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 24, background: 'var(--color-card)' }}>
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
