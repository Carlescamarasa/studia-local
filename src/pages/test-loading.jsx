import React, { useState } from "react";
import { Button } from "@/components/ds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { LoadingSpinner, Skeleton, SkeletonText, SkeletonCard, EmptyState, FormField } from "@/components/ds";
import { Badge } from "@/components/ds";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/ds/PageHeader";
import { SkipLink } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";
import { toast } from "sonner";
import { 
  Play, Save, Upload, RefreshCw, Trash2, Download, 
  Inbox, Search, AlertCircle, Plus, Music, Users,
  FileText, FolderOpen, Sparkles, CheckCircle2, XCircle,
  Clock, Target, Zap, Star, TrendingUp, Activity
} from "lucide-react";

export default function TestLoadingPage() {
  const [loadingStates, setLoadingStates] = useState({
    button1: false,
    button2: false,
    button3: false,
    button4: false,
    button5: false,
  });

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    descripcion: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalSize, setModalSize] = useState("md");

  const simulateAction = (key, duration = 2000) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }, duration);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.nombre) errors.nombre = "El nombre es requerido";
    if (!formData.email) {
      errors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "El email no es válido";
    }
    if (formData.descripcion && formData.descripcion.length < 10) {
      errors.descripcion = "La descripción debe tener al menos 10 caracteres";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length === 0) {
      alert("Formulario válido!");
    }
  };

  const tableData = [
    { id: 1, nombre: "Juan Pérez", email: "juan@example.com", estado: "active", prioridad: "high" },
    { id: 2, nombre: "María García", email: "maria@example.com", estado: "pending", prioridad: "medium" },
    { id: 3, nombre: "Carlos López", email: "carlos@example.com", estado: "completed", prioridad: "low" },
    { id: 4, nombre: "Ana Martínez", email: "ana@example.com", estado: "cancelled", prioridad: "critical" },
  ];

  const estadoLabels = {
    active: "Activo",
    pending: "Pendiente",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  const estadoStyles = {
    active: componentStyles.status.statusActive,
    pending: componentStyles.status.statusPending,
    completed: componentStyles.status.statusCompleted,
    cancelled: componentStyles.status.statusCancelled,
  };

  const prioridadLabels = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
  };

  const prioridadStyles = {
    low: componentStyles.status.priorityLow,
    medium: componentStyles.status.priorityMedium,
    high: componentStyles.status.priorityHigh,
    critical: componentStyles.status.priorityCritical,
  };

  return (
    <TooltipProvider>
      <SkipLink href="#main-content" />
      <div className={componentStyles.layout.page} id="main-content">
        <PageHeader
          title="Prueba de Componentes del Design System"
          subtitle="Visualiza todos los componentes mejorados: loading, empty states, microinteracciones, elevación, tablas, formularios, modales, notificaciones, drag & drop, accesibilidad y más"
        />

        <div className="space-y-6">
          {/* LoadingSpinner */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>LoadingSpinner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Variante: inline</h3>
                <LoadingSpinner size="md" variant="inline" text="Cargando datos..." />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Variante: centered</h3>
                <div className="min-h-[200px] border border-[var(--color-border-default)] rounded-lg">
                  <LoadingSpinner size="lg" variant="centered" text="Cargando perfil..." />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Tamaños</h3>
                <div className="flex items-center gap-4">
                  <LoadingSpinner size="sm" variant="inline" />
                  <LoadingSpinner size="md" variant="inline" />
                  <LoadingSpinner size="lg" variant="inline" />
                  <LoadingSpinner size="xl" variant="inline" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skeleton Loaders */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Skeleton Loaders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Texto</h3>
                <div className="space-y-2">
                  <Skeleton variant="text" width="w-full" />
                  <Skeleton variant="text" width="w-3/4" />
                  <Skeleton variant="text" width="w-1/2" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Múltiples líneas</h3>
                <SkeletonText lines={3} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Card completa</h3>
                <SkeletonCard />
              </div>
            </CardContent>
          </Card>

          {/* Botones con estados de carga */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Botones con Loading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Botón Primary</h3>
                <Button
                  variant="primary"
                  loading={loadingStates.button1}
                  loadingText="Guardando..."
                  onClick={() => simulateAction('button1', 3000)}
                  className={componentStyles.buttons.primary}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Botón Outline</h3>
                <Button
                  variant="outline"
                  loading={loadingStates.button2}
                  loadingText="Importando..."
                  onClick={() => simulateAction('button2', 2500)}
                  className={componentStyles.buttons.outline}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Datos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sistema de Colores Semánticos */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Sistema de Colores Semánticos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Estados</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className={componentStyles.status.statusActive}>Activo</Badge>
                  <Badge className={componentStyles.status.statusPending}>Pendiente</Badge>
                  <Badge className={componentStyles.status.statusCompleted}>Completado</Badge>
                  <Badge className={componentStyles.status.statusCancelled}>Cancelado</Badge>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Prioridades</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className={componentStyles.status.priorityLow}>Baja</Badge>
                  <Badge className={componentStyles.status.priorityMedium}>Media</Badge>
                  <Badge className={componentStyles.status.priorityHigh}>Alta</Badge>
                  <Badge className={componentStyles.status.priorityCritical}>Crítica</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tablas Mejoradas */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Tablas Mejoradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Tabla con Zebra Stripping y Sticky Header</h3>
                  <div className="max-h-[400px] overflow-y-auto border border-[var(--color-border-default)] rounded-lg">
                    <Table>
                      <TableHeader sticky>
                        <TableRow>
                          <TableHead sortable>Nombre</TableHead>
                          <TableHead sortable>Email</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Prioridad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody zebra>
                        {tableData.map((row) => (
                          <TableRow key={row.id} clickable>
                            <TableCell>{row.nombre}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>
                              <Badge className={estadoStyles[row.estado]}>
                                {estadoLabels[row.estado]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={prioridadStyles[row.prioridad]}>
                                {prioridadLabels[row.prioridad]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-3">Tabla Compacta</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody zebra>
                      {tableData.slice(0, 3).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell compact>{row.id}</TableCell>
                          <TableCell compact>{row.nombre}</TableCell>
                          <TableCell compact>
                            <Button size="sm" variant="ghost" className={componentStyles.buttons.ghost}>
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sistema de Iconografía */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Sistema de Iconografía</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Tamaños Estándar</h3>
                <div className="flex items-center gap-4">
                  <Music className={componentStyles.icons.xs} />
                  <Music className={componentStyles.icons.sm} />
                  <Music className={componentStyles.icons.md} />
                  <Music className={componentStyles.icons.lg} />
                  <Music className={componentStyles.icons.xl} />
                  <Music className={componentStyles.icons["2xl"]} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Con Colores Semánticos</h3>
                <div className="flex items-center gap-4">
                  <CheckCircle2 className={`${componentStyles.icons.md} ${componentStyles.icons.success}`} />
                  <AlertCircle className={`${componentStyles.icons.md} ${componentStyles.icons.warning}`} />
                  <XCircle className={`${componentStyles.icons.md} ${componentStyles.icons.danger}`} />
                  <Target className={`${componentStyles.icons.md} ${componentStyles.icons.primary}`} />
                  <Activity className={`${componentStyles.icons.md} ${componentStyles.icons.info}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formularios Mejorados */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Formularios Mejorados</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <FormField
                  label="Nombre Completo"
                  required
                  error={formErrors.nombre}
                >
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ingresa tu nombre"
                    className={componentStyles.forms.input}
                  />
                </FormField>

                <FormField
                  label="Email"
                  required
                  error={formErrors.email}
                  help="Usaremos este email para contactarte"
                >
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu@email.com"
                    className={componentStyles.forms.input}
                  />
                </FormField>

                <FormField
                  label="Descripción"
                  optional
                  error={formErrors.descripcion}
                  success={formData.descripcion && formData.descripcion.length >= 10 ? "Descripción válida" : undefined}
                >
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describe tu proyecto..."
                    className={componentStyles.forms.input}
                    rows={3}
                  />
                </FormField>

                <div className="flex gap-2">
                  <Button type="submit" className={componentStyles.buttons.primary}>
                    <Save className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                  <Button type="button" variant="outline" className={componentStyles.buttons.outline} onClick={() => {
                    setFormData({ nombre: "", email: "", descripcion: "" });
                    setFormErrors({});
                  }}>
                    Limpiar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Modales Mejorados */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Modales Mejorados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Tamaños de Modal</h3>
                <div className="flex gap-2 flex-wrap">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className={componentStyles.buttons.outline}>
                        Modal Pequeño
                      </Button>
                    </DialogTrigger>
                    <DialogContent size="sm">
                      <DialogHeader>
                        <DialogTitle>Modal Pequeño</DialogTitle>
                        <DialogDescription>
                          Este es un modal de tamaño pequeño (max-w-sm)
                        </DialogDescription>
                      </DialogHeader>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Contenido del modal pequeño.
                      </p>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {}}>Cancelar</Button>
                        <Button className={componentStyles.buttons.primary}>Aceptar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className={componentStyles.buttons.outline}>
                        Modal Mediano
                      </Button>
                    </DialogTrigger>
                    <DialogContent size="md">
                      <DialogHeader>
                        <DialogTitle>Modal Mediano</DialogTitle>
                        <DialogDescription>
                          Este es un modal de tamaño mediano (max-w-lg) - tamaño por defecto
                        </DialogDescription>
                      </DialogHeader>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Contenido del modal mediano con más espacio.
                      </p>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {}}>Cancelar</Button>
                        <Button className={componentStyles.buttons.primary}>Aceptar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className={componentStyles.buttons.outline}>
                        Modal Grande
                      </Button>
                    </DialogTrigger>
                    <DialogContent size="lg">
                      <DialogHeader>
                        <DialogTitle>Modal Grande</DialogTitle>
                        <DialogDescription>
                          Este es un modal de tamaño grande (max-w-2xl)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          Contenido del modal grande con mucho espacio para formularios o contenido extenso.
                        </p>
                        <FormField label="Campo de ejemplo" help="Este es un ejemplo de campo en el modal">
                          <Input placeholder="Escribe algo..." className={componentStyles.forms.input} />
                        </FormField>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {}}>Cancelar</Button>
                        <Button className={componentStyles.buttons.primary}>Aceptar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className={componentStyles.buttons.outline}>
                        Modal Extra Grande
                      </Button>
                    </DialogTrigger>
                    <DialogContent size="xl">
                      <DialogHeader>
                        <DialogTitle>Modal Extra Grande</DialogTitle>
                        <DialogDescription>
                          Este es un modal de tamaño extra grande (max-w-4xl)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          Contenido del modal extra grande ideal para tablas, gráficos o contenido muy extenso.
                        </p>
                        <div className={componentStyles.layout.grid2}>
                          <Card className={componentStyles.containers.cardBase}>
                            <CardContent className="pt-4">
                              <h4 className="font-semibold mb-2">Columna 1</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">Contenido de ejemplo</p>
                            </CardContent>
                          </Card>
                          <Card className={componentStyles.containers.cardBase}>
                            <CardContent className="pt-4">
                              <h4 className="font-semibold mb-2">Columna 2</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">Contenido de ejemplo</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {}}>Cancelar</Button>
                        <Button className={componentStyles.buttons.primary}>Aceptar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  <strong>Características de los modales:</strong> Backdrop blur, animaciones de entrada/salida, tamaños estándar (sm, md, lg, xl, full), y estilos unificados.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Empty States */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Empty States Mejorados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Sin Datos</h3>
                <EmptyState
                  variant="noData"
                  icon={<Inbox className="w-16 h-16" />}
                  title="No hay asignaciones"
                  description="Aún no has creado ninguna asignación. Comienza creando tu primera asignación para tus estudiantes."
                  action={
                    <Button className={componentStyles.buttons.primary}>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primera Asignación
                    </Button>
                  }
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Sin Resultados</h3>
                <EmptyState
                  variant="noResults"
                  icon={<Search className="w-12 h-12" />}
                  title="No se encontraron resultados"
                  description="Intenta ajustar tus filtros de búsqueda para encontrar lo que buscas."
                />
              </div>
            </CardContent>
          </Card>

          {/* Microinteracciones */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Microinteracciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Cards Interactivas</h3>
                <div className={componentStyles.layout.grid3}>
                  <Card 
                    interactive 
                    className={`${componentStyles.containers.cardBase} ${componentStyles.elevation.level1} ${componentStyles.elevation.hoverLevel2}`}
                  >
                    <CardContent className="pt-4">
                      <Music className="w-8 h-8 mb-2 text-[var(--color-primary)]" />
                      <h4 className="font-semibold mb-1">Pieza Musical</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">Hover para ver efecto</p>
                    </CardContent>
                  </Card>
                  <Card 
                    interactive 
                    className={`${componentStyles.containers.cardBase} ${componentStyles.elevation.level1} ${componentStyles.elevation.hoverLevel2}`}
                  >
                    <CardContent className="pt-4">
                      <Users className="w-8 h-8 mb-2 text-[var(--color-info)]" />
                      <h4 className="font-semibold mb-1">Estudiantes</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">Hover para ver efecto</p>
                    </CardContent>
                  </Card>
                  <Card 
                    interactive 
                    className={`${componentStyles.containers.cardBase} ${componentStyles.elevation.level1} ${componentStyles.elevation.hoverLevel2}`}
                  >
                    <CardContent className="pt-4">
                      <FileText className="w-8 h-8 mb-2 text-[var(--color-success)]" />
                      <h4 className="font-semibold mb-1">Documentos</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">Hover para ver efecto</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sistema de Elevación */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Sistema de Elevación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Niveles de Elevación</h3>
                <div className={componentStyles.layout.grid2}>
                  <div className={`p-4 rounded-lg ${componentStyles.elevation.level1}`}>
                    <p className="text-sm font-semibold mb-1">Nivel 1</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Cards base</p>
                  </div>
                  <div className={`p-4 rounded-lg ${componentStyles.elevation.level2}`}>
                    <p className="text-sm font-semibold mb-1">Nivel 2</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Cards hover</p>
                  </div>
                  <div className={`p-4 rounded-lg ${componentStyles.elevation.level3}`}>
                    <p className="text-sm font-semibold mb-1">Nivel 3</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Modales</p>
                  </div>
                  <div className={`p-4 rounded-lg ${componentStyles.elevation.level4}`}>
                    <p className="text-sm font-semibold mb-1">Nivel 4</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Dropdowns</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tooltips */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Tooltips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Tooltips en Botones</h3>
                <div className="flex gap-3 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button className={componentStyles.buttons.primary}>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Guarda los cambios realizados</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className={componentStyles.buttons.outline}>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Importa datos desde un archivo</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instrucciones */}
          <Card className={componentStyles.containers.cardBase}>
            <CardHeader>
              <CardTitle>Instrucciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-[var(--color-text-secondary)]">
                <li><strong>Loading:</strong> Haz clic en los botones para ver los estados de carga (2-3 segundos)</li>
                <li><strong>Empty States:</strong> Ejemplos de estados vacíos mejorados con iconos y acciones</li>
                <li><strong>Microinteracciones:</strong> Pasa el mouse sobre las cards y botones para ver los efectos</li>
                <li><strong>Elevación:</strong> Observa los diferentes niveles de sombra y el efecto hover</li>
                <li><strong>Tablas:</strong> Headers sticky, zebra striping, hover mejorado. Haz scroll para ver el header fijo</li>
                <li><strong>Formularios:</strong> Validación visual en tiempo real. Intenta enviar sin completar campos</li>
                <li><strong>Modales:</strong> Diferentes tamaños (sm, md, lg, xl) con backdrop blur y animaciones</li>
                <li><strong>Colores Semánticos:</strong> Estados y prioridades con badges estandarizados</li>
                <li><strong>Iconografía:</strong> Tamaños estándar y colores semánticos disponibles</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
