interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  className?: string
}

export function LoadingSpinner({ size = 'medium', text, className = '' }: LoadingSpinnerProps) {
  const classes = ['loading-indicator', `loading-indicator-${size}`, className].filter(Boolean).join(' ')

  return (
    <div className={classes} data-testid="loading-spinner" role="status" aria-live="polite">
      <span className="loading-orbit" data-testid="loading-spinner-icon" aria-hidden="true">
        <span className="loading-orbit-dot" />
      </span>
      {text ? (
        <span id="loading-spinner-text" className="loading-indicator-text" data-testid="loading-spinner-text">
          {text}
        </span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  )
}

export default LoadingSpinner
