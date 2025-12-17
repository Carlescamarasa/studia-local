import React from 'react';
import { Card, CardContent } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Bug, Copy, Check } from 'lucide-react';
import { componentStyles } from '@/design/componentStyles';
import { log } from '@/utils/log';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      reportSent: false,
      copied: false
    };
    this.handleReportSent = this.handleReportSent.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log del error (siempre loguea errores, incluso en producción)
    log.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  componentDidMount() {
    // Escuchar cuando se envía el reporte exitosamente
    window.addEventListener('error-report-sent', this.handleReportSent);
  }

  componentWillUnmount() {
    window.removeEventListener('error-report-sent', this.handleReportSent);
  }

  handleReportSent() {
    this.setState({ reportSent: true });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, reportSent: false, copied: false });
    window.location.reload();
  };

  handleCopyDetails = async () => {
    const { error, errorInfo } = this.state;

    // Construir el texto completo con todos los detalles
    let detailsText = '';

    if (error) {
      detailsText += `Error: ${error.toString()}\n`;
      if (error.stack) {
        detailsText += `\nStack trace:\n${error.stack}\n`;
      }
    }

    if (errorInfo?.componentStack) {
      detailsText += `\nComponent stack:\n${errorInfo.componentStack}`;
    }

    try {
      await navigator.clipboard.writeText(detailsText);
      this.setState({ copied: true });
      setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);
    } catch (err) {
      log.error('Error al copiar al portapapeles:', err);
      // Fallback: intentar con el método antiguo
      const textArea = document.createElement('textarea');
      textArea.value = detailsText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.setState({ copied: true });
        setTimeout(() => {
          this.setState({ copied: false });
        }, 2000);
      } catch (fallbackErr) {
        log.error('Error en fallback de copia:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  render() {
    if (this.state.hasError) {
      const isCompact = this.props.variant === 'compact';
      const containerClasses = isCompact
        ? "w-full h-full flex items-center justify-center min-h-[400px] p-4"
        : "min-h-screen flex items-center justify-center bg-background p-4";

      const cardClasses = isCompact
        ? `w-full max-w-xl ${componentStyles.containers.cardBase} border-[var(--color-danger)] shadow-sm`
        : `max-w-2xl w-full ${componentStyles.containers.cardBase} border-[var(--color-danger)]`;

      return (
        <div className={containerClasses}>
          <Card className={cardClasses}>
            <CardContent className="pt-6 text-center space-y-6">
              <div className="flex justify-center">
                <AlertCircle className={`text-[var(--color-danger)] ${isCompact ? 'w-10 h-10' : 'w-16 h-16'}`} />
              </div>

              <div>
                <h2 className={`${isCompact ? 'text-lg font-bold' : componentStyles.typography.sectionTitle} mb-2`}>
                  {this.state.reportSent ? 'Reporte enviado' : 'Algo salió mal'}
                </h2>
                <p className={`${componentStyles.typography.bodyText} ${isCompact ? 'text-sm' : ''}`}>
                  {this.state.reportSent
                    ? '✅ Gracias por reportar. Revisaremos el problema pronto.'
                    : 'La aplicación encontró un error inesperado al cargar esta sección.'}
                </p>
              </div>

              {this.state.error && (
                <div className="text-left bg-[var(--color-surface-muted)] rounded-lg p-4 text-sm max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Detalles técnicos:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={this.handleCopyDetails}
                      className="h-7 px-2 text-xs hover:bg-[var(--color-surface-elevated)]"
                      title="Copiar detalles técnicos al portapapeles"
                    >
                      {this.state.copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5 text-[var(--color-success)]" />
                          <span className="text-[var(--color-success)]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[var(--color-text-secondary)] break-words font-mono text-xs">
                      {this.state.error.toString()}
                    </p>
                    {this.state.error?.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-medium mb-1">
                          Ver stack trace
                        </summary>
                        <pre className="mt-1 text-xs text-[var(--color-text-secondary)] break-words whitespace-pre-wrap font-mono bg-[var(--color-surface)]/50 p-2 rounded">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-medium mb-1">
                          Ver component stack
                        </summary>
                        <pre className="mt-1 text-xs text-[var(--color-text-secondary)] break-words whitespace-pre-wrap font-mono bg-[var(--color-surface)]/50 p-2 rounded">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    log.debug('[ErrorBoundary] Botón "Reportar error" clickeado');
                    log.debug('[ErrorBoundary] Estado del error:', {
                      error: this.state.error,
                      errorInfo: this.state.errorInfo,
                    });

                    // Convertir el Error a un objeto serializable
                    const serializableError = {
                      message: this.state.error?.message || 'Error desconocido',
                      stack: this.state.error?.stack || '',
                      name: this.state.error?.name || 'Error',
                      toString: this.state.error?.toString() || String(this.state.error || 'Error desconocido'),
                    };

                    const serializableErrorInfo = {
                      componentStack: this.state.errorInfo?.componentStack || '',
                      toString: this.state.errorInfo?.toString() || String(this.state.errorInfo || ''),
                    };

                    // Abrir modal de reporte con el error
                    try {
                      const eventDetail = {
                        error: serializableError,
                        errorInfo: serializableErrorInfo,
                        category: 'algo_no_funciona',
                      };

                      log.debug('[ErrorBoundary] Disparando evento open-error-report con detail:', eventDetail);

                      const event = new CustomEvent('open-error-report', {
                        detail: eventDetail,
                        bubbles: true,
                        cancelable: true
                      });

                      const dispatched = window.dispatchEvent(event);
                      log.debug('[ErrorBoundary] Evento disparado, dispatched:', dispatched);
                      log.debug('[ErrorBoundary] Esperando que Layout escuche el evento...');
                    } catch (error) {
                      log.error('[ErrorBoundary] Error al disparar evento:', error);
                      // Fallback: intentar sin serializar (aunque puede fallar)
                      window.dispatchEvent(new CustomEvent('open-error-report', {
                        detail: { category: 'algo_no_funciona' },
                        bubbles: true,
                        cancelable: true
                      }));
                    }
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

