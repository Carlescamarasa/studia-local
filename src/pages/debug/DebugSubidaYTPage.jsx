import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ds";
import { Upload, Loader2, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { toast } from "sonner";
import PageHeader from "@/components/ds/PageHeader";
import RequireRole from "@/components/auth/RequireRole";

function DebugSubidaYTPageContent() {
  const [file, setFile] = useState(null);
  const [metaText, setMetaText] = useState("");
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Por favor, selecciona un archivo de vídeo');
      return;
    }

    setStatus('uploading');
    setResult(null);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en las variables de entorno');
      }

      // Crear FormData
      const formData = new FormData();
      formData.append('file', file);
      
      if (metaText.trim()) {
        formData.append('meta', metaText.trim());
      }

      // Llamar a la Edge Function
      const functionUrl = `${supabaseUrl}/functions/v1/upload-youtube`;
      console.log('[DebugSubidaYT] Llamando a Edge Function:', functionUrl);
      
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          // NO poner Content-Type, el navegador lo añade automáticamente con boundary para FormData
        },
        body: formData,
      });

      console.log('[DebugSubidaYT] Respuesta recibida:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
      });

      // Intentar parsear JSON
      let json = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          json = await res.json();
        } catch (parseError) {
          console.error('[DebugSubidaYT] Error parseando JSON de respuesta:', parseError);
          const text = await res.text().catch(() => '');
          console.error('[DebugSubidaYT] Respuesta como texto:', text);
        }
      } else {
        // Si no es JSON, leer como texto
        const text = await res.text().catch(() => '');
        console.warn('[DebugSubidaYT] Respuesta no es JSON:', { contentType, text });
        json = { message: text || 'Error desconocido' };
      }

      if (res.ok && json.success) {
        setStatus('success');
        setResult(json);
        toast.success('Vídeo subido correctamente (simulado)');
      } else {
        setStatus('error');
        const errorMsg = json.message || json.error || res.statusText || 'Error desconocido';
        setError(`Error ${res.status}: ${errorMsg}`);
        console.error('[DebugSubidaYT] Error en respuesta:', {
          status: res.status,
          statusText: res.statusText,
          json,
        });
        toast.error(`Error al subir el vídeo: ${errorMsg}`);
      }
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Error al subir el vídeo';
      const errorDetails = err instanceof Error ? {
        name: err.name,
        message: err.message,
        stack: err.stack,
      } : err;
      
      console.error('[DebugSubidaYT] Excepción al llamar a Edge Function:', errorDetails);
      setError(`Error de red: ${errorMessage}`);
      toast.error(`Error de conexión: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setFile(null);
    setMetaText("");
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <PageHeader
        title="Debug subida a YouTube"
        subtitle="Entorno de pruebas para la subida de vídeos a YouTube"
      />

      <div className="max-w-4xl mx-auto mt-6 space-y-6">
        {/* Card principal */}
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Formulario de prueba</CardTitle>
              <Badge variant="warning">DEBUG</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input de archivo */}
              <div className="space-y-2">
                <Label htmlFor="video-file" className="text-[var(--color-text-primary)]">
                  Archivo de vídeo *
                </Label>
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={status === 'uploading'}
                  className={componentStyles.controls.inputDefault}
                />
                {file && (
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Archivo seleccionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Campo meta */}
              <div className="space-y-2">
                <Label htmlFor="meta" className="text-[var(--color-text-primary)]">
                  Metadata (JSON opcional)
                </Label>
                <Textarea
                  id="meta"
                  placeholder='{"alumno_id": "...", "profesor_id": "...", "comentarios": "..."}'
                  value={metaText}
                  onChange={(e) => setMetaText(e.target.value)}
                  disabled={status === 'uploading'}
                  className={`${componentStyles.controls.inputDefault} font-mono text-sm`}
                  rows={4}
                />
                <p className="text-xs text-[var(--color-text-secondary)]">
                  JSON opcional con metadatos del vídeo
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={!file || status === 'uploading'}
                  className={componentStyles.buttons.primary}
                >
                  {status === 'uploading' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir vídeo (test)
                    </>
                  )}
                </Button>
                {(status === 'success' || status === 'error') && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className={componentStyles.buttons.secondary}
                  >
                    Reiniciar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Panel de resultados */}
        {(status !== 'idle' || result || error) && (
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estado */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  Estado:
                </span>
                {status === 'uploading' && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Subiendo
                  </Badge>
                )}
                {status === 'success' && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Éxito
                  </Badge>
                )}
                {status === 'error' && (
                  <Badge variant="danger" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Error
                  </Badge>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
                  <p className="text-sm text-[var(--color-danger)] font-medium mb-1">Error:</p>
                  <p className="text-sm text-[var(--color-danger)]">{error}</p>
                </div>
              )}

              {/* Resultado JSON */}
              {result && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]">
                    <p className="text-xs font-medium text-[var(--color-text-primary)] mb-2">
                      Respuesta JSON:
                    </p>
                    <pre className="text-xs font-mono text-[var(--color-text-secondary)] overflow-auto max-h-96">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>

                  {/* Enlace al vídeo fake */}
                  {result.fakeUrl && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-info)]/10 border border-[var(--color-info)]/20">
                      <ExternalLink className="w-4 h-4 text-[var(--color-info)]" />
                      <a
                        href={result.fakeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--color-info)] hover:underline"
                      >
                        Ver vídeo en YouTube (fake): {result.fakeVideoId}
                      </a>
                    </div>
                  )}

                  {/* Información adicional */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--color-text-secondary)]">ID del vídeo:</span>
                      <span className="ml-2 font-mono text-[var(--color-text-primary)]">
                        {result.fakeVideoId}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-secondary)]">Tamaño:</span>
                      <span className="ml-2 text-[var(--color-text-primary)]">
                        {(result.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-secondary)]">Archivo original:</span>
                      <span className="ml-2 text-[var(--color-text-primary)]">
                        {result.originalFilename}
                      </span>
                    </div>
                    {result.meta && (
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Metadata:</span>
                        <span className="ml-2 text-[var(--color-text-primary)]">
                          {JSON.stringify(result.meta)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function DebugSubidaYTPage() {
  return (
    <RequireRole anyOf={['ADMIN']}>
      <DebugSubidaYTPageContent />
    </RequireRole>
  );
}

