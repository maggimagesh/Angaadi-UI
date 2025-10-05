interface ToggleButtonGroupProps<T extends string> {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  testIdPrefix: string
  variant?: 'rounded' | 'pill'
  disabled?: boolean
}

export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  testIdPrefix,
  variant = 'pill',
  disabled = false
}: ToggleButtonGroupProps<T>) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map((option) => {
        const isSelected = value === option
        return (
          <button
            key={option}
            id={`${testIdPrefix}-${option.toLowerCase()}`}
            data-testid={`${testIdPrefix}-${option.toLowerCase()}`}
            type="button"
            onClick={() => onChange(option)}
            disabled={disabled}
            style={{
              borderRadius: variant === 'pill' ? 'var(--radius-full)' : 'var(--radius-md)',
              padding: '8px 16px',
              background: isSelected ? 'var(--color-primary)' : 'var(--color-primary-container)',
              color: isSelected ? 'var(--color-on-primary)' : 'var(--color-muted)',
              border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-outline)'}`,
              fontWeight: 700,
              fontSize: 'var(--font-sm)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            aria-pressed={isSelected}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
