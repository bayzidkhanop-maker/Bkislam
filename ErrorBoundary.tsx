import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let parsedError;
      try {
        parsedError = JSON.parse(this.state.errorMessage);
      } catch (e) {
        parsedError = null;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-xl w-full bg-white p-6 rounded-lg shadow-lg border border-red-200">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Permission Denied</h1>
            {parsedError ? (
              <div className="space-y-2 text-sm">
                <p><strong>Error:</strong> {parsedError.error}</p>
                <p><strong>Operation:</strong> {parsedError.operationType}</p>
                <p><strong>Path:</strong> {parsedError.path}</p>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mt-4">
                  <h3 className="font-bold text-yellow-800 mb-2">Action Required: Update Firebase Rules</h3>
                  <p className="text-yellow-700 mb-2">
                    Because you manually connected your Firebase project, your Firestore database is likely still using the default "deny all" security rules.
                  </p>
                  <p className="text-yellow-700">
                    Please go to your <strong>Firebase Console &gt; Firestore Database &gt; Rules</strong> and paste the correct rules to allow access.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">{this.state.errorMessage}</p>
            )}
            <button
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
