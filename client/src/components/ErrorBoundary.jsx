/**
 * ErrorBoundary — Global React Error Boundary
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing the app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: "'Inter', -apple-system, sans-serif",
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#e2e8f0',
        }}>
          <div style={{
            maxWidth: '480px',
            textAlign: 'center',
            padding: '3rem 2rem',
            borderRadius: '16px',
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 0 0.75rem',
              color: '#f1f5f9',
            }}>
              Something went wrong
            </h1>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              margin: '0 0 2rem',
            }}>
              An unexpected error occurred. Please try refreshing or going back to the home page.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.4)';
              }}
            >
              Go to Home Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
