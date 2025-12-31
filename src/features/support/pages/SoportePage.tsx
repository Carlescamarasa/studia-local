 
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Badge } from "@/features/shared/components/ds";
import {
  MessageSquare,
  Plus,
  Send,
  Upload,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Trash2
} from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { toast } from "sonner";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import RequireRole from "@/features/auth/components/RequireRole";
import {
  getTicketsByAlumno,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getMensajesByTicket,
  createMensaje
} from "@/data/supportTicketsClient";
import { uploadVideoToYouTube } from "@/utils/uploadVideoToYouTube";
import MediaLinksBadges from "@/features/shared/components/media/MediaLinksBadges";
import MediaPreviewModal from "@/features/shared/components/media/MediaPreviewModal";
import MediaLinksInput from "@/features/shared/components/media/MediaLinksInput";
import { useAuth } from "@/auth/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/features/shared/components/ui/dialog";
import type { SupportTicket, SupportMensaje, MediaItem } from "@/features/shared/types/domain";

// Extended types for UI with extra fields from the client mapper
interface SupportTicketUI extends SupportTicket {
  _alumnoNombre?: string | null;
  _profesorNombre?: string | null;
}

interface SupportMensajeUI extends SupportMensaje {
  _autorNombre?: string | null;
}

// MediaItem can be string or object in some contexts, normalizing here for safety
type MediaType = string | MediaItem;

function SoportePageContent() {
  // ===== TODOS LOS HOOKS AL PRINCIPIO - SIEMPRE EN EL MISMO ORDEN =====

  // Hook de autenticación
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Hooks de estado
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketTipo, setNewTicketTipo] = useState<SupportTicket['tipo']>('duda_general');
  const [messageText, setMessageText] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mediaLinks, setMediaLinks] = useState<MediaType[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [selectedMediaLinks, setSelectedMediaLinks] = useState<(string | MediaItem)[]>([]);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Hooks de React Query - SIEMPRE se declaran, usando 'enabled' para controlar la ejecución
  // Obtener tickets del alumno (incluyen nombres de perfiles en la consulta)
  const { data: tickets, isLoading: loadingTickets, error: ticketsError } = useQuery<SupportTicketUI[], Error>({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuario no disponible');
      return (await getTicketsByAlumno(user.id)) as SupportTicketUI[];
    },
    enabled: !!user && !!profile,
    retry: false,
  });

  useEffect(() => {
    if (ticketsError) {
      console.error('[Soporte] Error cargando tickets:', ticketsError);
    }
  }, [ticketsError]);

  // Obtener ticket seleccionado
  const { data: selectedTicket } = useQuery<SupportTicketUI, Error>({
    queryKey: ['support-ticket', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) throw new Error('Ticket ID no disponible');
      return (await getTicketById(selectedTicketId)) as SupportTicketUI;
    },
    enabled: !!selectedTicketId && !!user && !!profile,
  });

  // Obtener mensajes del ticket seleccionado
  const { data: mensajes, isLoading: loadingMensajes } = useQuery<SupportMensajeUI[], Error>({
    queryKey: ['support-mensajes', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) throw new Error('Ticket ID no disponible');
      return (await getMensajesByTicket(selectedTicketId)) as SupportMensajeUI[];
    },
    enabled: !!selectedTicketId && !!user && !!profile,
  });

  // Mutación para crear ticket
  const createTicketMutation = useMutation<SupportTicket, Error, Parameters<typeof createTicket>[0]>({
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
  const createMensajeMutation = useMutation<SupportMensaje, Error, Parameters<typeof createMensaje>[0]>({
    mutationFn: createMensaje,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['support-mensajes', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });

      setMessageText("");
      setVideoFile(null);
      setUploadingVideo(false);
      toast.success('Mensaje enviado');
    },
    onError: (error) => {
      toast.error(`Error al enviar mensaje: ${error.message}`);
      setUploadingVideo(false);
    },
  });

  // Estado para confirmación de eliminación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mutación para eliminar ticket
  const deleteTicketMutation = useMutation({
    mutationFn: ({ ticketId, alumnoId }: { ticketId: string; alumnoId: string }) => deleteTicket(ticketId, alumnoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setSelectedTicketId(null);
      setShowDeleteConfirm(false);
      toast.success('Conversación eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
      setShowDeleteConfirm(false);
    },
  });

  const handleDeleteTicket = () => {
    if (!selectedTicketId || !user?.id) return;
    deleteTicketMutation.mutate({ ticketId: selectedTicketId, alumnoId: user.id });
  };

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

    if (!messageText.trim() && !videoFile && mediaLinks.length === 0) {
      toast.error('Por favor, escribe un mensaje o adjunta contenido multimedia');
      return;
    }

    setUploadingVideo(true);

    try {
      let finalMediaLinks: string[] = []; // Inicializar como array de strings vacio

      // Normalizar mediaLinks (state) a string[]
      if (mediaLinks.length > 0) {
        finalMediaLinks = mediaLinks.map(link => {
          if (typeof link === 'string') return link;
          if (link && typeof link === 'object' && link.url) return link.url;
          return '';
        }).filter(Boolean);
      }

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
            finalMediaLinks.push(uploadResult.videoUrl);
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
        texto: messageText.trim() || (videoFile || mediaLinks.length > 0 ? 'Contenido multimedia adjunto' : ''),
        mediaLinks: finalMediaLinks,
      });
    } catch (error) {
      console.error('[Soporte] Error enviando mensaje:', error);
      toast.error(`Error al enviar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setUploadingVideo(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
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

  const formatDate = (dateString: string) => {
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
    <div className="bg-background min-h-screen">
      <PageHeader
        icon={MessageSquare}
        title="Centro de dudas"
        subtitle="Comunícate con tu profesor y resuelve tus dudas"
        actions={
          <Button
            onClick={() => setShowNewTicketModal(true)}
            className={componentStyles.buttons.primary}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo
          </Button>
        }
      />

      <div className="studia-section py-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Lista de tickets */}
          {/* Lista de tickets */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {tickets && tickets.length > 0 ? (
              <div className="space-y-3">
                {(tickets || []).map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`border border-[var(--color-border-default)] bg-[var(--color-surface-default)] px-4 py-3 md:px-5 md:py-4 shadow-sm cursor-pointer transition-colors ${selectedTicketId === ticket.id
                      ? 'border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                      : 'hover:bg-[var(--color-surface-muted)]'
                      }`}
                    style={{ borderRadius: 'var(--card-radius, 0.75rem)' }}
                  >
                    {/* Título y Badges */}
                    <div className="mb-2">
                      <h3 className="font-medium text-sm text-[var(--color-text-primary)] line-clamp-2 mb-1.5">
                        {ticket.titulo}
                      </h3>
                      <div className="flex flex-col gap-1 items-start">
                        {ticket.ultimaRespuestaDe === 'profesor' && (
                          <Badge variant="info" className="text-xs px-2 py-0.5 shrink-0">
                            Nueva respuesta
                          </Badge>
                        )}
                        {getEstadoBadge(ticket.estado)}
                      </div>
                    </div>

                    {/* Profesor asignado */}
                    {ticket._profesorNombre ? (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mb-1.5">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">Profesor: {ticket._profesorNombre}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]/70 mb-1.5 italic">
                        <User className="w-3 h-3 shrink-0" />
                        <span>Profesor: Sin asignar</span>
                      </div>
                    )}

                    {/* Fecha */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatDate(ticket.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--color-text-secondary)] bg-[var(--color-surface-default)] rounded-xl border border-[var(--color-border-default)]">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No tienes tickets aún</p>
                <p className="text-xs mt-1">Crea uno nuevo para empezar</p>
              </div>
            )}
          </div>

          {/* Vista de ticket seleccionado */}
          <div className="lg:col-span-2">
            {selectedTicketId ? (
              <Card className={componentStyles.containers.cardBase}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle>{selectedTicket?.titulo}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {selectedTicket && getEstadoBadge(selectedTicket.estado)}
                        {selectedTicket?.tipo && (
                          <Badge variant="outline">{selectedTicket.tipo}</Badge>
                        )}
                      </div>
                      {/* Mostrar nombre del profesor asignado en el detalle */}
                      {selectedTicket && (
                        <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                          {selectedTicket._profesorNombre ? (
                            <>Profesor asignado: <span className="font-medium">{selectedTicket._profesorNombre}</span></>
                          ) : (
                            <span className="italic">Profesor asignado: Sin asignar</span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Delete button */}
                    {!showDeleteConfirm ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                        title="Eliminar conversación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deleteTicketMutation.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteTicket}
                          disabled={deleteTicketMutation.isPending}
                          className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90"
                        >
                          {deleteTicketMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Eliminar'
                          )}
                        </Button>
                      </div>
                    )}
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
                              className={`max-w-[75%] rounded-lg p-3 shadow-sm ${isAlumno
                                ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                                : 'bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]'
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-xs font-semibold ${isAlumno
                                  ? 'text-[var(--color-primary)]'
                                  : 'text-[var(--color-text-secondary)]'
                                  }`}>
                                  {isAlumno
                                    ? 'Tú'
                                    : mensaje._autorNombre
                                      ? `Profesor – ${mensaje._autorNombre}`
                                      : 'Profesor'}
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
                                    onMediaClick={(idx: number) => {
                                      const normalizedLinks = (mensaje.mediaLinks || []).map(link =>
                                        typeof link === 'string' ? { url: link, type: 'image' } as MediaItem : link
                                      );
                                      // Force cast strictly for the setter
                                      setSelectedMediaLinks(normalizedLinks);
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
                  {selectedTicket && (
                    <div className="border-t border-[var(--color-border-default)] pt-6 mt-6 space-y-4">
                      {/* Banner de advertencia si el ticket está cerrado y el usuario es el propietario */}
                      {selectedTicket.estado === 'cerrado' && selectedTicket.alumnoId === user?.id && (
                        <Alert className={`${componentStyles.containers.panelBase} border-[var(--color-info)] bg-[var(--color-info)]/10`}>
                          <AlertCircle className="h-4 w-4 text-[var(--color-info)]" />
                          <AlertDescription className="text-sm text-[var(--color-text-primary)]">
                            Este ticket está cerrado. Si envías un nuevo mensaje, se reabrirá automáticamente.
                          </AlertDescription>
                        </Alert>
                      )}

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
                      <MediaLinksInput
                        value={mediaLinks}
                        onChange={(links) => setMediaLinks(links as MediaType[])}
                        showFileUpload={true}
                        videoFile={videoFile}
                        onVideoFileChange={setVideoFile}
                        uploadingVideo={uploadingVideo}
                        disabled={createMensajeMutation.isPending}
                        videoId="video-file"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={uploadingVideo || createMensajeMutation.isPending || (!messageText.trim() && !videoFile && mediaLinks.length === 0)}
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
              <DialogDescription>
                Crea un nuevo ticket de soporte para reportar un problema o hacer una pregunta
              </DialogDescription>
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
                  value={newTicketTipo || ""}
                  onChange={(e) => setNewTicketTipo(e.target.value as SupportTicket['tipo'])}
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
