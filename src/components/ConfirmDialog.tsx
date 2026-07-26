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
  title = 'Clear this?',
  description = null,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  testIdPrefix = 'confirm-dialog',
}: ConfirmDialogProps) {
  if (!open) return null

  const modalId = `${testIdPrefix}-modal`
  const contentId = `${testIdPrefix}-content`
  const titleId = `${testIdPrefix}-title`
  const confirmId = `${testIdPrefix}-yes`
  const cancelId = `${testIdPrefix}-no`

  return (
    <div
      className="dialog-backdrop modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      id={modalId}
      data-testid={modalId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="dialog elev-lg modal-surface"
        data-testid={contentId}
        style={{ width: 'min(440px, 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <h2 className="dialog-title" id={titleId} data-testid={titleId}>
            {title}
          </h2>
        </div>

        {description && <div className="dialog-body">{description}</div>}

        <div className="dialog-actions">
          <button id={cancelId} data-testid={cancelId} className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button id={confirmId} data-testid={confirmId} className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
