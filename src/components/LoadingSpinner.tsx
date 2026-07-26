import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  className?: string
}

export function LoadingSpinner({ size = 'medium', text, className = '' }: LoadingSpinnerProps) {
  const sizeStyles = {
    small: { width: '16px', height: '16px', borderWidth: '2px' },
    medium: { width: '24px', height: '24px', borderWidth: '3px' },
    large: { width: '32px', height: '32px', borderWidth: '4px' }
  }

  const spinnerStyle: React.CSSProperties = {
    ...sizeStyles[size],
    border: `${sizeStyles[size].borderWidth} solid var(--color-border)`,
    borderTop: `${sizeStyles[size].borderWidth} solid var(--color-primary)`,
    borderRadius: 0,
    animation: 'spin 1s linear infinite',
    display: 'inline-block'
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    ...(className ? {} : {})
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={containerStyle} className={className} data-testid="loading-spinner">
        <div 
          style={spinnerStyle}
          role="status"
          aria-label="Loading"
          data-testid="loading-spinner-icon"
        />
        {text && (
          <span id="loading-spinner-text" data-testid="loading-spinner-text" style={{ fontSize: 'var(--font-sm)', color: 'var(--color-muted)' }} aria-live="polite">
            {text}
          </span>
        )}
      </div>
    </>
  )
}

export default LoadingSpinner
