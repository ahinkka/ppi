import * as React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error({
      error,
      componentStack: info.componentStack,
      // ownerStack: React.captureOwnerStack()
    })
  }

  render() {
    if ((this.state as unknown as { hasError?: boolean})?.hasError) {
      // You can render any custom fallback UI
      return []
    }

    return (this.props as unknown as { children?: never })?.children
  }
}
