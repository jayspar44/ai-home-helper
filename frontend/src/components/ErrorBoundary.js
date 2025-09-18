import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">!</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                We're sorry, but something unexpected happened. This could be a configuration issue.
              </p>

              <div className="bg-gray-100 p-3 rounded text-xs font-mono">
                <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600">Technical Details</summary>
                    <pre className="mt-2 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </details>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="text-blue-800 text-sm">
                  <strong>Debugging Tips:</strong>
                </p>
                <ul className="text-blue-700 text-sm mt-1 space-y-1">
                  <li>• Check browser console for more errors</li>
                  <li>• Verify Firebase configuration is set</li>
                  <li>• Check network requests to /api/health</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;