import React from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erro de renderização capturado:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#fff' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ocorreu um erro ao exibir esta tela.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#c9a227', color: '#000', fontWeight: 700 }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}
