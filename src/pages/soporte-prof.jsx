import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ds";
import {
  MessageSquare,
  Send,
  Upload,
  Loader2,
  X,
  Search,
  Filter,
  CheckCircle,
  Clock,
  User,
  Trash2,
  List,
  MailOpen
} from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { toast } from "sonner";
import PageHeader from "@/components/ds/PageHeader";
import RequireRole from "@/components/auth/RequireRole";
import {
  getTicketsByProfesor,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getMensajesByTicket,
  createMensaje
} from "@/data/supportTicketsClient";
import { uploadVideoToYouTube } from "@/utils/uploadVideoToYouTube";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import MediaPreviewModal from "@/components/common/MediaPreviewModal";
import MediaLinksInput from "@/components/common/MediaLinksInput";
import { useAuth } from "@/auth/AuthProvider";

function SoporteProfPageContent() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Todos los hooks deben declararse antes de cualquier return condicional
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [selectedMediaLinks, setSelectedMediaLinks] = useState([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [alumnoNames, setAlumnoNames] = useState({});
  // Filtro de profesor: por defecto "mis_tickets" (solo tickets asignados al profesor actual)
  const [profesorFilter, setProfesorFilter] = useState('mis_tickets');

  // Calcular isAdmin antes de los hooks que lo usan
  const isAdmin = profile?.role === 'ADMIN';

  // Obtener tickets (debe estar antes del return condicional)
  // Con las nuevas políticas RLS, todos los profesores pueden ver todos los tickets
  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['support-tickets-prof', user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      // Todos los PROF pueden ver todos los tickets ahora (las políticas RLS lo permiten)
      if (isAdmin) {
        return getAllTickets();
      } else {
        // Aunque el backend devuelve todos los tickets, la UI filtra por profesor asignado por defecto
        return getAllTickets();
      }
    },
    enabled: !!user,
    retry: false,
    onError: (error) => {
      console.error('[SoporteProf] Error cargando tickets:', error);
      // No mostrar toast aquí para evitar spam si las tablas no existen aún
    },
  });

  // Obtener nombres de alumnos desde los tickets (ya vienen en la consulta)
  // Ya no necesitamos hacer peticiones adicionales a profiles
  useEffect(() => {
    if (tickets && tickets.length > 0) {
      const names = {};
      tickets.forEach((ticket) => {
        // Los nombres ya vienen en los tickets desde supportTicketsClient
        if (ticket.alumnoId && ticket._alumnoNombre) {
          names[ticket.alumnoId] = ticket._alumnoNombre;
        }
      });
      setAlumnoNames(names);
    }
  }, [tickets]);

  // Filtrar tickets
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    let filtered = tickets;

    // Filtrar por profesor asignado (por defecto solo mis tickets)
    if (!isAdmin && profesorFilter === 'mis_tickets') {
      filtered = filtered.filter(t => t.profesorId === user?.id);
    }
    // Si es admin y el filtro es por profesor específico, se aplicaría aquí (pendiente de implementar selector de profesor)

    // Filtrar por estado
    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(t => t.estado === estadoFilter);
    }

    // Filtrar por búsqueda
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(t => {
        const alumnoName = alumnoNames[t.alumnoId]?.toLowerCase() || '';
        return (
          t.titulo.toLowerCase().includes(searchLower) ||
          alumnoName.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [tickets, estadoFilter, searchText, alumnoNames, profesorFilter, user?.id, isAdmin]);

  // Obtener ticket seleccionado
  const { data: selectedTicket } = useQuery({
    queryKey: ['support-ticket', selectedTicketId],
    queryFn: () => getTicketById(selectedTicketId),
    enabled: !!selectedTicketId,
  });

  // Obtener mensajes del ticket seleccionado
  const { data: mensajes, isLoading: loadingMensajes } = useQuery({
    queryKey: ['support-mensajes', selectedTicketId],
    queryFn: () => getMensajesByTicket(selectedTicketId),
    enabled: !!selectedTicketId,
  });

  // Mutación para actualizar ticket
  const updateTicketMutation = useMutation({
    mutationFn: updateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets-prof'] });
      toast.success('Ticket actualizado');
    },
    onError: (error) => {
      toast.error(`Error al actualizar ticket: ${error.message}`);
    },
  });

  // Mutación para crear mensaje
  const createMensajeMutation = useMutation({
    mutationFn: createMensaje,
    onSuccess: async (mensaje, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-mensajes', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets-prof'] });
      setMessageText("");
      setVideoFile(null);
      setMediaLinks([]);
      toast.success('Mensaje enviado');
    },
    onError: (error) => {
      toast.error(`Error al enviar mensaje: ${error.message}`);
      setUploadingVideo(false);
    },
  });

  // Estado para confirmación de eliminación (solo admin)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mutación para eliminar ticket (solo admin)
  const deleteTicketMutation = useMutation({
    mutationFn: ({ ticketId, userId, isAdmin }) => deleteTicket(ticketId, userId, isAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets-prof'] });
      setSelectedTicketId(null);
      setShowDeleteConfirm(false);
      toast.success('Conversación eliminada');
    },
    onError: (error) => {
      toast.error(`Error al eliminar: ${error.message}`);
      setShowDeleteConfirm(false);
    },
  });

  const handleDeleteTicket = () => {
    if (!selectedTicketId || !user?.id || !isAdmin) return;
    deleteTicketMutation.mutate({ ticketId: selectedTicketId, userId: user.id, isAdmin: true });
  };

  const handleUpdateEstado = (nuevoEstado) => {
    if (!selectedTicketId || !selectedTicket) return;

    updateTicketMutation.mutate({
      id: selectedTicketId,
      estado: nuevoEstado,
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
      let finalMediaLinks = [...mediaLinks]; // Incluir enlaces multimedia manuales

      // Si hay vídeo, subirlo primero
      if (videoFile) {
        try {
          const uploadResult = await uploadVideoToYouTube(videoFile, {
            contexto: 'ticket_profesor',
            profesor_id: user.id,
            profesor_nombre: profile.full_name,
            alumno_id: selectedTicket?.alumnoId || undefined,
            ticket_id: selectedTicketId,
            comentarios: messageText.trim() || undefined,
          });

          if (uploadResult.ok && uploadResult.videoUrl) {
            finalMediaLinks.push(uploadResult.videoUrl);
          } else {
            throw new Error(uploadResult.error || 'Error al subir el vídeo');
          }
        } catch (error) {
          console.error('[SoporteProf] Error subiendo vídeo:', error);
          toast.error(`Error al subir el vídeo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          setUploadingVideo(false);
          return;
        }
      }

      // Crear el mensaje
      createMensajeMutation.mutate({
        ticketId: selectedTicketId,
        autorId: user.id,
        rolAutor: isAdmin ? 'admin' : 'profesor', // ADMIN usa 'admin', PROF usa 'profesor'
        texto: messageText.trim() || (videoFile || mediaLinks.length > 0 ? 'Contenido multimedia adjunto' : ''),
        mediaLinks: finalMediaLinks,
      });
    } catch (error) {
      console.error('[SoporteProf] Error enviando mensaje:', error);
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
      <PageHeader
        title={isAdmin ? "Tickets de soporte" : "Tickets de alumnos"}
        subtitle={isAdmin ? "Gestiona todos los tickets del sistema" : "Responde a las dudas de tus alumnos"}
      />

      <div className="studia-section py-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Lista de tickets */}
          <div className="lg:col-span-1">
            <Card className={componentStyles.containers.cardBase}>
              <CardHeader>
                <CardTitle>Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros */}
                <div className="space-y-3">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Input
                      placeholder="Buscar por título o alumno..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className={componentStyles.controls.inputDefault}
                    />
                  </div>

                  {/* Filtro de profesor (solo visible para PROF, no ADMIN) */}
                  {!isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant={profesorFilter === 'mis_tickets' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setProfesorFilter('mis_tickets')}
                        className={`flex-1 text-xs h-8 sm:h-9 px-2 sm:px-3 ${profesorFilter === 'mis_tickets'
                          ? componentStyles.buttons.primary
                          : componentStyles.buttons.outline
                          }`}
                      >
                        Mis tickets
                      </Button>
                      <Button
                        variant={profesorFilter === 'todos' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setProfesorFilter('todos')}
                        className={`flex-1 text-xs h-8 sm:h-9 px-2 sm:px-3 ${profesorFilter === 'todos'
                          ? componentStyles.buttons.primary
                          : componentStyles.buttons.outline
                          }`}
                      >
                        Todos
                      </Button>
                    </div>
                  )}

                  {/* Filtros de estado */}
                  <div className="flex gap-1 w-full">
                    <Button
                      variant={estadoFilter === 'todos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEstadoFilter('todos')}
                      title="Todos"
                      className="flex-1"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={estadoFilter === 'abierto' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEstadoFilter('abierto')}
                      title="Abiertos"
                      className="flex-1"
                    >
                      <MailOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={estadoFilter === 'en_proceso' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEstadoFilter('en_proceso')}
                      title="En proceso"
                      className="flex-1"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={estadoFilter === 'cerrado' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEstadoFilter('cerrado')}
                      title="Cerrados"
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Lista */}
                {filteredTickets && filteredTickets.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`border border-[var(--color-border-default)] bg-[var(--color-surface-default)] px-4 py-3 md:px-5 md:py-4 shadow-sm cursor-pointer transition-colors ${selectedTicketId === ticket.id
                          ? 'border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                          : 'hover:bg-[var(--color-surface-muted)]'
                          }`}
                        style={{ borderRadius: 'var(--card-radius, 0.75rem)' }}
                      >
                        {/* Fila principal: título + estatus */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-medium text-sm text-[var(--color-text-primary)] line-clamp-2 flex-1 min-w-0">
                            {ticket.titulo}
                          </h3>
                          <div className="shrink-0">
                            {getEstadoBadge(ticket.estado)}
                          </div>
                        </div>

                        {/* Nombre del alumno */}
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mb-1.5">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">Alumno: {alumnoNames[ticket.alumnoId] || ticket._alumnoNombre || 'Desconocido'}</span>
                        </div>

                        {/* Fecha y badge de nueva respuesta */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{formatDate(ticket.updated_at)}</span>
                          </div>
                          {ticket.ultimaRespuestaDe === 'alumno' && (
                            <Badge variant="info" className="text-xs px-2 py-0.5 shrink-0">
                              Nueva respuesta
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-secondary)]">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay tickets</p>
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
                    <div className="flex-1">
                      <CardTitle>{selectedTicket?.titulo}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {selectedTicket && getEstadoBadge(selectedTicket.estado)}
                        {selectedTicket?.tipo && (
                          <Badge variant="outline">{selectedTicket.tipo}</Badge>
                        )}
                      </div>
                      {/* Mostrar información del alumno y profesor en el detalle */}
                      {selectedTicket && (
                        <>
                          <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                            Alumno: <span className="font-medium">{alumnoNames[selectedTicket.alumnoId] || selectedTicket._alumnoNombre || 'Desconocido'}</span>
                          </div>
                          {selectedTicket.profesorId && selectedTicket._profesorNombre && (
                            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                              Profesor: <span className="font-medium">{selectedTicket._profesorNombre}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTicket && selectedTicket.estado !== 'cerrado' && (
                        <select
                          value={selectedTicket.estado}
                          onChange={(e) => handleUpdateEstado(e.target.value)}
                          className={componentStyles.controls.inputDefault}
                          disabled={updateTicketMutation.isPending}
                        >
                          <option value="abierto">Abierto</option>
                          <option value="en_proceso">En proceso</option>
                          <option value="cerrado">Cerrado</option>
                        </select>
                      )}
                      {/* Delete button - solo admin */}
                      {isAdmin && !showDeleteConfirm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                          title="Eliminar conversación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && showDeleteConfirm && (
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
                        const isProfesor = mensaje.rolAutor === 'profesor';
                        const isAdminMsg = mensaje.rolAutor === 'admin';
                        const isProfesorOrAdmin = isProfesor || isAdminMsg;
                        const isCurrentUser = isProfesorOrAdmin && mensaje.autorId === user?.id;
                        const alumnoNombre = mensaje.rolAutor === 'alumno' ? mensaje._autorNombre || null : null;
                        const profesorNombre = isProfesor && !isCurrentUser ? mensaje._autorNombre || null : null;
                        const adminNombre = isAdminMsg && !isCurrentUser ? mensaje._autorNombre || null : null;

                        return (
                          <div
                            key={mensaje.id}
                            className={`flex ${isProfesorOrAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-lg p-3 shadow-sm ${isProfesorOrAdmin
                                ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                                : 'bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]'
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-xs font-semibold ${isProfesorOrAdmin
                                  ? 'text-[var(--color-primary)]'
                                  : 'text-[var(--color-text-secondary)]'
                                  }`}>
                                  {isCurrentUser
                                    ? 'Tú'
                                    : isAdminMsg
                                      ? adminNombre
                                        ? `Admin – ${adminNombre}`
                                        : 'Admin'
                                      : isProfesor
                                        ? profesorNombre
                                          ? `Profesor – ${profesorNombre}`
                                          : 'Profesor'
                                        : alumnoNombre
                                          ? `Alumno – ${alumnoNombre}`
                                          : 'Alumno'}
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
                        <Label htmlFor="message-text">Tu respuesta</Label>
                        <Textarea
                          id="message-text"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          rows={4}
                          className={componentStyles.controls.inputDefault}
                        />
                      </div>
                      <MediaLinksInput
                        value={mediaLinks}
                        onChange={setMediaLinks}
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
                            Enviar respuesta
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

export default function SoporteProfPage() {
  return (
    <RequireRole anyOf={['PROF', 'ADMIN']}>
      <SoporteProfPageContent />
    </RequireRole>
  );
}

