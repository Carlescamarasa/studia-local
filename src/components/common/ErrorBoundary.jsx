import React from 'react';
import { Card, CardContent } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Bug } from 'lucide-react';
import { componentStyles } from '@/design/componentStyles';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
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

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className={`max-w-2xl w-full ${componentStyles.containers.cardBase} border-[var(--color-danger)]`}>
            <CardContent className="pt-6 text-center space-y-6">
              <div className="flex justify-center">
                <AlertCircle className="w-16 h-16 text-[var(--color-danger)]" />
              </div>
              
              <div>
                <h2 className={`${componentStyles.typography.sectionTitle} mb-2`}>
                  Algo salió mal
                </h2>
                <p className={componentStyles.typography.bodyText}>
                  La aplicación encontró un error inesperado. Por favor, reporta este problema para que podamos solucionarlo.
                </p>
              </div>

              {this.state.error && (
                <div className="text-left bg-[var(--color-surface-muted)] rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2">Detalles técnicos:</p>
                  <p className="text-[var(--color-text-secondary)] break-words">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    // Abrir modal de reporte con el error
                    window.dispatchEvent(new CustomEvent('open-error-report', {
                      detail: {
                        error: this.state.error,
                        errorInfo: this.state.errorInfo,
                        category: 'Algo no funciona',
                      }
                    }));
                  }}
                  className={`${componentStyles.buttons.primary} gap-2`}
                >
                  <Bug className="w-4 h-4" />
                  Reportar error
                </Button>
                
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className={`${componentStyles.buttons.outline} gap-2`}
                >
                  <RefreshCw className="w-4 h-4" />
                  Recargar página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

