import type { ReactNode } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title?: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  testIdPrefix?: string
}

export default function ConfirmDialog({
  open,
  title = 'Are you sure want to clear?',
  description = null,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  testIdPrefix = 'confirm-dialog'
}: ConfirmDialogProps) {
  if (!open) return null

  const modalId = `${testIdPrefix}-modal`
  const contentId = `${testIdPrefix}-content`
  const titleId = `${testIdPrefix}-title`
  const confirmId = `${testIdPrefix}-yes`
  const cancelId = `${testIdPrefix}-no`

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      id={modalId}
      data-testid={modalId}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 70
      }}
    >
      <div
        className="card modal-surface"
        data-testid={contentId}
        style={{
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          padding: 20,
          minWidth: 420,
          position: 'relative',
          borderRadius: 16,
          boxShadow: 'var(--elev-3)'
        }}
      >
        <h3
          id={titleId}
          data-testid={titleId}
          style={{ margin: '0 0 8px 0', fontWeight: 800, color: 'var(--color-text)' }}
        >
          {title}
        </h3>

        {description && (
          <div style={{ marginBottom: 16, color: 'var(--color-text)', opacity: 0.9 }}>
            {description}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            id={cancelId}
            data-testid={cancelId}
            className="btn"
            onClick={onCancel}
            style={{ borderRadius: 'var(--radius-full)', height: 36, padding: '0 14px' }}
          >
            {cancelLabel}
          </button>
          <button
            id={confirmId}
            data-testid={confirmId}
            className="btn btn-primary"
            onClick={onConfirm}
            style={{ borderRadius: 'var(--radius-full)', height: 36, padding: '0 14px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
