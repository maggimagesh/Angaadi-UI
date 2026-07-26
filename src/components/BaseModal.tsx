import { useEffect, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

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

const sizeWidths = {
  small: 'min(420px, 100%)',
  medium: 'min(520px, 100%)',
  large: 'min(700px, 100%)',
}

/**
 * The shared dialog shell, on `.dialog-backdrop` / `.dialog`: square corners,
 * a 2px rule under the title, actions flush right. Focus is trapped inside
 * while it is open and returns to the trigger on close; Escape closes.
 */
export function BaseModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  testIdPrefix = 'modal',
  showCloseButton = true,
}: BaseModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    returnFocusTo.current = document.activeElement as HTMLElement | null

    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      )

    focusables()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      returnFocusTo.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="dialog-backdrop modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${testIdPrefix}-title`}
      id={`${testIdPrefix}-modal`}
      data-testid={`${testIdPrefix}-modal`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="dialog elev-lg modal-surface"
        ref={dialogRef}
        data-testid={`${testIdPrefix}-content`}
        style={{ width: sizeWidths[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <h2 className="dialog-title" id={`${testIdPrefix}-title`} data-testid={`${testIdPrefix}-title`}>
            {title}
          </h2>
          {showCloseButton && (
            <button
              className="dialog-close"
              id={`${testIdPrefix}-close`}
              data-testid={`${testIdPrefix}-close`}
              aria-label="Close"
              onClick={onClose}
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>

        <div className="dialog-body">{children}</div>

        {footer && <div className="dialog-actions">{footer}</div>}
      </div>
    </div>
  )
}
