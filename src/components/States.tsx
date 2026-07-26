import type { ReactNode } from 'react'

/**
 * The three global states, as ruled blocks.
 *
 * Empty states name the actual reason and offer the buttons that resolve it.
 * Error states are bordered in the accent, label the operation that failed in
 * 11px uppercase, and never surface a stack trace or raw JSON.
 */

type Action = {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'secondary'
}

function Actions({ actions }: { actions: Action[] }) {
  if (!actions.length) return null
  return (
    <div className="state-actions">
      {actions.map((a) => {
        const className = `btn btn-${a.variant ?? 'secondary'}`
        return a.href ? (
          <a key={a.label} className={className} href={a.href}>
            {a.label}
          </a>
        ) : (
          <button key={a.label} type="button" className={className} onClick={a.onClick}>
            {a.label}
          </button>
        )
      })}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  actions = [],
  id,
  testId,
  children,
}: {
  title: string
  body?: ReactNode
  actions?: Action[]
  id?: string
  testId?: string
  children?: ReactNode
}) {
  return (
    <div className="state-block" id={id} data-testid={testId}>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children}
      <Actions actions={actions} />
    </div>
  )
}

export function ErrorState({
  /** The operation that failed, e.g. `/products/by-category`. */
  operation,
  title,
  body,
  actions = [],
  id,
  testId,
}: {
  operation: string
  title: string
  body?: ReactNode
  actions?: Action[]
  id?: string
  testId?: string
}) {
  return (
    <div className="state-block state-error" role="alert" id={id} data-testid={testId}>
      <div className="state-label">Error · {operation}</div>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      <Actions actions={actions} />
    </div>
  )
}
