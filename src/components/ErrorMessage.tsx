interface ErrorMessageProps {
  message: string
  testId?: string
}

export function ErrorMessage({ message, testId = 'error-message' }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div
      id={testId}
      data-testid={testId}
      style={{
        backgroundColor: 'var(--color-danger-container)',
        color: 'var(--color-danger)',
        padding: '10px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px'
      }}
    >
      {message}
    </div>
  )
}
