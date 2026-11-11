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
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg)',
      };

      const cardStyle = {
        maxWidth: '480px',
        width: '100%',
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border)',
        padding: '32px',
        textAlign: 'center',
      };

      const iconStyle = {
        fontSize: '40px',
        color: 'var(--danger)',
        marginBottom: '16px',
        display: 'inline-block',
      };

      const headingStyle = {
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '8px',
      };

      const textStyle = {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        marginBottom: '24px',
      };

      const buttonStyle = {
        padding: '10px 24px',
        backgroundColor: 'var(--primary)',
        color: 'var(--surface)',
        fontWeight: 500,
        fontSize: '14px',
        borderRadius: 'var(--radius)',
        transition: 'background-color 0.15s ease',
      };

      return (
        <div style={containerStyle}>
          <div style={cardStyle}>
            <span style={iconStyle}>⚠</span>
            <h1 style={headingStyle}>Something went wrong</h1>
            <p style={textStyle}>
              An unexpected error occurred. Your session is safe — please refresh the page or go back.
            </p>
            <button
              type="button"
              style={buttonStyle}
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
