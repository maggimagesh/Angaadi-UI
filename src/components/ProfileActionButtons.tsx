import type { ReactNode } from 'react'

type ProfileActionButtonsProps = {
  onUpdate: () => void
  onClear: () => void
  updateLabel?: string
  clearLabel?: string
  disableUpdate?: boolean
  disableClear?: boolean
  testIdPrefix?: string
  children?: ReactNode
}

export default function ProfileActionButtons({
  onUpdate,
  onClear,
  updateLabel = 'Update',
  clearLabel = 'Clear',
  disableUpdate = false,
  disableClear = false,
  testIdPrefix = 'profile-action',
  children
}: ProfileActionButtonsProps) {
  const updateId = `${testIdPrefix}-update`
  const clearId = `${testIdPrefix}-clear`

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        id={updateId}
        data-testid={updateId}
        className="btn btn-primary"
        onClick={onUpdate}
        style={{ borderRadius: 0, height: 32, padding: '0 12px', fontSize: 14 }}
        disabled={disableUpdate}
      >
        {updateLabel}
      </button>
      <button
        id={clearId}
        data-testid={clearId}
        className="btn"
        onClick={onClear}
        style={{ borderRadius: 0, height: 32, padding: '0 12px', fontSize: 14 }}
        disabled={disableClear}
      >
        {clearLabel}
      </button>
      {children}
    </div>
  )
}
