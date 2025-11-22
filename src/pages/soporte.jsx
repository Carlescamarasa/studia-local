import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ds";
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Upload, 
  Loader2, 
  X,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { toast } from "sonner";
import PageHeader from "@/components/ds/PageHeader";
import RequireRole from "@/components/auth/RequireRole";
import { 
  getTicketsByAlumno, 
  getTicketById, 
  createTicket, 
  updateTicket,
  getMensajesByTicket,
  createMensaje
} from "@/data/supportTicketsClient";
import { uploadVideoToYouTube } from "@/utils/uploadVideoToYouTube";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import MediaPreviewModal from "@/components/common/MediaPreviewModal";
import { useAuth } from "@/auth/AuthProvider";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SoportePageContent() {
  // ===== TODOS LOS HOOKS AL PRINCIPIO - SIEMPRE EN EL MISMO ORDEN =====
  
  // Hook de autenticación
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Hooks de estado
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketTipo, setNewTicketTipo] = useState('duda_general');
  const [messageText, setMessageText] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [selectedMediaLinks, setSelectedMediaLinks] = useState([]);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Hooks de React Query - SIEMPRE se declaran, usando 'enabled' para controlar la ejecución
  // Obtener tickets del alumno
  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('Usuario no disponible');
      return getTicketsByAlumno(user.id);
    },
    enabled: !!user && !!profile,
    retry: false,
    onError: (error) => {
      console.error('[Soporte] Error cargando tickets:', error);
      // No mostrar toast aquí para evitar spam si las tablas no existen aún
    },
  });

  // Obtener ticket seleccionado
  const { data: selectedTicket } = useQuery({
    queryKey: ['support-ticket', selectedTicketId],
    queryFn: () => {
      if (!selectedTicketId) throw new Error('Ticket ID no disponible');
      return getTicketById(selectedTicketId);
    },
    enabled: !!selectedTicketId && !!user && !!profile,
  });

  // Obtener mensajes del ticket seleccionado
  const { data: mensajes, isLoading: loadingMensajes } = useQuery({
    queryKey: ['support-mensajes', selectedTicketId],
    queryFn: () => {
      if (!selectedTicketId) throw new Error('Ticket ID no disponible');
      return getMensajesByTicket(selectedTicketId);
    },
    enabled: !!selectedTicketId && !!user && !!profile,
  });

  // Mutación para crear ticket
  const createTicketMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setSelectedTicketId(newTicket.id);
      setShowNewTicketModal(false);
      setNewTicketTitle("");
      toast.success('Ticket creado correctamente');
    },
    onError: (error) => {
      toast.error(`Error al crear ticket: ${error.message}`);
    },
  });

  // Mutación para crear mensaje
  const createMensajeMutation = useMutation({
    mutationFn: createMensaje,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-mensajes', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setMessageText("");
      setVideoFile(null);
      toast.success('Mensaje enviado');
    },
    onError: (error) => {
      toast.error(`Error al enviar mensaje: ${error.message}`);
      setUploadingVideo(false);
    },
  });

  // ===== RETURNS CONDICIONALES DESPUÉS DE TODOS LOS HOOKS =====
  
  // Validar que user y profile estén disponibles
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const handleCreateTicket = async () => {
    if (!newTicketTitle.trim()) {
      toast.error('Por favor, escribe un título para el ticket');
      return;
    }

    if (!user || !profile) return;

    createTicketMutation.mutate({
      alumnoId: user.id,
      profesorId: profile.profesor_asignado_id || null,
      estado: 'abierto',
      tipo: newTicketTipo,
      titulo: newTicketTitle.trim(),
    });
  };

  const handleSendMessage = async () => {
    if (!selectedTicketId || !user || !profile) return;

    if (!messageText.trim() && !videoFile) {
      toast.error('Por favor, escribe un mensaje o adjunta un vídeo');
      return;
    }

    setUploadingVideo(true);

    try {
      let mediaLinks = [];

      // Si hay vídeo, subirlo primero
      if (videoFile) {
        try {
          const uploadResult = await uploadVideoToYouTube(videoFile, {
            contexto: 'ticket_alumno',
            alumno_id: user.id,
            alumno_nombre: profile.full_name,
            profesor_id: selectedTicket?.profesorId || undefined,
            ticket_id: selectedTicketId,
            comentarios: messageText.trim() || undefined,
          });

          if (uploadResult.ok && uploadResult.videoUrl) {
            mediaLinks.push(uploadResult.videoUrl);
          } else {
            throw new Error(uploadResult.error || 'Error al subir el vídeo');
          }
        } catch (error) {
          console.error('[Soporte] Error subiendo vídeo:', error);
          toast.error(`Error al subir el vídeo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          setUploadingVideo(false);
          return;
        }
      }

      // Crear el mensaje
      createMensajeMutation.mutate({
        ticketId: selectedTicketId,
        autorId: user.id,
        rolAutor: 'alumno',
        texto: messageText.trim() || (videoFile ? 'Vídeo adjunto' : ''),
        mediaLinks,
      });
    } catch (error) {
      console.error('[Soporte] Error enviando mensaje:', error);
      toast.error(`Error al enviar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setUploadingVideo(false);
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'abierto':
        return <Badge variant="info">Abierto</Badge>;
      case 'en_proceso':
        return <Badge variant="warning">En proceso</Badge>;
      case 'cerrado':
        return <Badge variant="default">Cerrado</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loadingTickets) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <PageHeader
          title="Centro de dudas"
          subtitle="Comunícate con tu profesor y resuelve tus dudas"
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de tickets */}
        <div className="lg:col-span-1">
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tus tickets</CardTitle>
                <Button
                  onClick={() => setShowNewTicketModal(true)}
                  className={componentStyles.buttons.primary}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tickets && tickets.length > 0 ? (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTicketId === ticket.id
                          ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]'
                          : 'bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-muted)]/80'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm text-[var(--color-text-primary)] line-clamp-2">
                          {ticket.titulo}
                        </h3>
                        {getEstadoBadge(ticket.estado)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <Clock className="w-3 h-3" />
                        {formatDate(ticket.updated_at)}
                      </div>
                      {ticket.ultimaRespuestaDe === 'profesor' && (
                        <div className="mt-2">
                          <Badge variant="success" className="text-xs">
                            Nueva respuesta
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tienes tickets aún</p>
                  <p className="text-xs mt-1">Crea uno nuevo para empezar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vista de ticket seleccionado */}
        <div className="lg:col-span-2">
          {selectedTicketId ? (
            <Card className={componentStyles.containers.cardBase}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedTicket?.titulo}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedTicket && getEstadoBadge(selectedTicket.estado)}
                      {selectedTicket?.tipo && (
                        <Badge variant="outline">{selectedTicket.tipo}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mensajes */}
                {loadingMensajes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                  </div>
                ) : mensajes && mensajes.length > 0 ? (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {mensajes.map((mensaje) => {
                      const isAlumno = mensaje.rolAutor === 'alumno';
                      return (
                        <div
                          key={mensaje.id}
                          className={`flex ${isAlumno ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg p-3 shadow-sm ${
                              isAlumno
                                ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                                : 'bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-xs font-semibold ${
                                isAlumno 
                                  ? 'text-[var(--color-primary)]' 
                                  : 'text-[var(--color-text-secondary)]'
                              }`}>
                                {isAlumno ? 'Tú' : 'Profesor'}
                              </span>
                              <span className="text-xs text-[var(--color-text-secondary)] opacity-70">
                                {formatDate(mensaje.created_at)}
                              </span>
                            </div>
                            {mensaje.texto && (
                              <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                                {mensaje.texto}
                              </p>
                            )}
                            {mensaje.mediaLinks && mensaje.mediaLinks.length > 0 && (
                              <div className={`mt-2 ${mensaje.texto ? 'pt-2 border-t border-[var(--color-border-default)]/50' : ''}`}>
                                <MediaLinksBadges
                                  mediaLinks={mensaje.mediaLinks}
                                  onMediaClick={(idx) => {
                                    setSelectedMediaLinks(mensaje.mediaLinks);
                                    setSelectedMediaIndex(idx);
                                    setShowMediaModal(true);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-secondary)]">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay mensajes aún</p>
                  </div>
                )}

                {/* Formulario de respuesta */}
                {selectedTicket && selectedTicket.estado !== 'cerrado' && (
                  <div className="border-t border-[var(--color-border-default)] pt-6 mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message-text">Tu mensaje</Label>
                      <Textarea
                        id="message-text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Escribe tu mensaje..."
                        rows={4}
                        className={componentStyles.controls.inputDefault}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="video-file">Vídeo (opcional)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="video-file"
                          type="file"
                          accept="video/*"
                          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                          className={componentStyles.controls.inputDefault}
                          disabled={uploadingVideo}
                        />
                        {videoFile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVideoFile(null)}
                            disabled={uploadingVideo}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {videoFile && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Archivo seleccionado: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={uploadingVideo || createMensajeMutation.isPending || (!messageText.trim() && !videoFile)}
                      className={componentStyles.buttons.primary}
                    >
                      {uploadingVideo || createMensajeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {uploadingVideo ? 'Subiendo vídeo...' : 'Enviando...'}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className={componentStyles.containers.cardBase}>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center text-[var(--color-text-secondary)]">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un ticket para ver los mensajes</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </div>

        {/* Modal para nuevo ticket */}
        <Dialog open={showNewTicketModal} onOpenChange={setShowNewTicketModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-title">Título</Label>
                <Input
                  id="ticket-title"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="Ej: Duda sobre respiración"
                  className={componentStyles.controls.inputDefault}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-tipo">Tipo</Label>
                <select
                  id="ticket-tipo"
                  value={newTicketTipo}
                  onChange={(e) => setNewTicketTipo(e.target.value)}
                  className={componentStyles.controls.inputDefault}
                >
                  <option value="duda_general">Duda general</option>
                  <option value="tecnica">Técnica</option>
                  <option value="pieza">Pieza</option>
                  <option value="ritmo">Ritmo</option>
                  <option value="sonido">Sonido</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewTicketModal(false)}
                  disabled={createTicketMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={createTicketMutation.isPending || !newTicketTitle.trim()}
                  className={componentStyles.buttons.primary}
                >
                  {createTicketMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear ticket'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal de preview de medios */}
      {showMediaModal && selectedMediaLinks.length > 0 && (
        <MediaPreviewModal
          urls={selectedMediaLinks}
          initialIndex={selectedMediaIndex || 0}
          open={showMediaModal}
          onClose={() => {
            setShowMediaModal(false);
            setSelectedMediaLinks([]);
            setSelectedMediaIndex(null);
          }}
        />
      )}
    </div>
  );
}

export default function SoportePage() {
  return (
    <RequireRole anyOf={['ESTU']}>
      <SoportePageContent />
    </RequireRole>
  );
}
