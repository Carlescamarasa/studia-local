import React from 'react';
import { Card, CardContent } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { componentStyles } from '@/design/componentStyles';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    // Log del error para debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className={`max-w-2xl w-full ${componentStyles.containers.cardBase}`}>
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className={`w-16 h-16 mx-auto ${componentStyles.empty.emptyIcon} text-[var(--color-danger)]`} />
              <div>
                <h2 className={`${componentStyles.typography.sectionTitle} mb-2`}>
                  Algo salió mal
                </h2>
                <p className={componentStyles.typography.bodyText}>
                  Ha ocurrido un error inesperado. Por favor, reporta este problema para que podamos solucionarlo.
                </p>
              </div>
              
              {this.props.onReportError && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => this.props.onReportError?.(this.state.error, this.state.errorInfo)}
                    className={componentStyles.buttons.primary}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Reportar error
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className={componentStyles.buttons.outline}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recargar página
                  </Button>
                </div>
              )}
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-[var(--color-text-secondary)] mb-2">
                    Detalles técnicos (solo desarrollo)
                  </summary>
                  <pre className="text-xs bg-[var(--color-surface-muted)] p-3 rounded overflow-auto max-h-64">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

