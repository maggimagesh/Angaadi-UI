import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './States'

/** Keep a failed render from removing the entire application. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Angaadi could not render this view', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="app-main" data-testid="app-recovery">
          <ErrorState
            operation="Display page"
            title="This view couldn't be displayed"
            body="Try opening it again. If the problem continues, return to the home page."
            actions={[
              { label: 'Try again', variant: 'primary', onClick: () => this.setState({ failed: false }) },
              { label: 'Go home', href: '/' },
            ]}
          />
        </div>
      )
    }
    return this.props.children
  }
}
