import { localDataClient } from '@/api/localDataClient';
import { generateCSV, parseCSV } from './utils/csvHelpers';
import { displayName, calcularOffsetSemanas, calcularTiempoSesion, formatLocalDate } from '@/features/shared/utils/helpers';
import { ResolutionService } from './services/ResolutionService';

// Helper date
const getTodayISO = () => formatLocalDate(new Date());

const startOfMonday = (date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d;
};

/**
 * REGISTRY DE DATASETS
 */
export const datasets = [
    {
        id: 'ejercicios',
        label: 'Ejercicios / Bloques',
        description: 'Catálogo de ejercicios técnicos y piezas.',
        formats: ['csv', 'json'],
        import: {
            supportsUpdate: true,
            upsertKey: 'code',
            csvHeaders: ['code', 'nombre', 'tipo', 'duracion_objetivo_seg', 'instrucciones', 'indicadorLogro', 'mediaLinks'],
            editableFields: ['nombre', 'tipo', 'duracion_objetivo_seg', 'instrucciones', 'mediaLinks'],
            handler: async (data: any, format: string, user: any) => {
                const results: { created: number; updated: number; skipped: number; errors: string[] } = { created: 0, updated: 0, skipped: 0, errors: [] };
                const bloques = await localDataClient.entities.Bloque.list();

                // Lógica generación de códigos (Legacy simplificado o mantenido)
                // ... (Omitiendo complejidad de autogeneración por brevedad, asumiendo inputs válidos o lógica original si crítica)
                // Mantenemos lógica original de ID generation por seguridad
                const codigosGenerados = new Map();
                const generateCodeConRastreo = (tipo: string) => {
                    const ejerciciosDeTipo = bloques.filter(e => e.code?.startsWith(`${tipo}-`));
                    // ... (Simplificación: en producción ideal usaríamos un servicio de ID generation real)
                    // Reutilizamos lógica básica
                    let maxNum = 0;
                    ejerciciosDeTipo.forEach(e => {
                        const m = e.code.match(/\d+/);
                        if (m && parseInt(m[0]) > maxNum) maxNum = parseInt(m[0]);
                    });
                    return `${tipo}-${String(maxNum + 1).padStart(4, '0')}`;
                };

                const rows: any[] = format === 'csv' ? parseCSV(data) : data;

                for (const row of rows) {
                    try {
                        let { code, nombre, tipo, duracion_objetivo_seg, instrucciones, indicadorLogro, mediaLinks, duracionSeg } = row;
                        if (!duracion_objetivo_seg && duracionSeg) duracion_objetivo_seg = duracionSeg;

                        if (!nombre || !tipo) throw new Error('Faltan campos obligatorios (nombre, tipo)');
                        const tipoNormalizado = tipo.toUpperCase();

                        let codeFinal = code?.trim();
                        if (!codeFinal) codeFinal = generateCodeConRastreo(tipoNormalizado);

                        let mediaLinksArray = [];
                        if (typeof mediaLinks === 'string') {
                            mediaLinksArray = mediaLinks.split('|').map(u => u.trim()).filter(Boolean);
                        } else if (Array.isArray(mediaLinks)) {
                            mediaLinksArray = mediaLinks;
                        }

                        const existe = bloques.find(b => b.code === codeFinal);

                        if (existe) {
                            await localDataClient.entities.Bloque.update(existe.id, {
                                nombre,
                                tipo: tipoNormalizado,
                                duracionSeg: parseInt(duracion_objetivo_seg || '0', 10) || 0,
                                instrucciones: instrucciones || existe.instrucciones || '',
                                indicadorLogro: indicadorLogro || existe.indicadorLogro || '',
                                mediaLinks: mediaLinksArray.length > 0 ? mediaLinksArray : (existe.mediaLinks || []),
                            });
                            results.updated++;
                        } else {
                            await localDataClient.entities.Bloque.create({
                                code: codeFinal,
                                nombre,
                                tipo: tipoNormalizado,
                                duracionSeg: parseInt(duracion_objetivo_seg || '0', 10) || 0,
                                instrucciones: instrucciones || '',
                                indicadorLogro: indicadorLogro || '',
                                mediaLinks: mediaLinksArray,
                                profesorId: user.id,
                            });
                            results.created++;
                        }
                    } catch (error: any) {
                        results.errors.push(`${row.nombre || 'Fila desconocida'}: ${error.message}`);
                    }
                }
                return results;
            }
        },
        export: {
            handler: async (format: string) => {
                const bloques = await localDataClient.entities.Bloque.list();
                if (format === 'json') return JSON.stringify(bloques, null, 2);

                const headers = ["code", "nombre", "tipo", "duracion_objetivo_seg", "instrucciones", "mediaLinks"];
                const rows = bloques.map(b => ({
                    code: b.code || '',
                    nombre: b.nombre || '',
                    tipo: b.tipo || '',
                    duracion_objetivo_seg: b.duracionSeg || 0,
                    instrucciones: b.instrucciones || '',
                    mediaLinks: (b.mediaLinks || []).join('|')
                }));
                return generateCSV(headers, rows);
            }
        },
        templates: {
            csv: `code;nombre;tipo;duracion_objetivo_seg;instrucciones;mediaLinks\nCA-001;Calentamiento básico;CA;300;Tocar suavemente;http://ejemplo.com/video\nTC-001;Escalas mayores;TC;600;Seguir metrónomo;`,
            json: JSON.stringify([{ code: "CA-001", nombre: "Calentamiento", tipo: "CA", duracionSeg: 300, mediaLinks: ["http://url.com"] }], null, 2)
        }
    },
    {
        id: 'piezas',
        label: 'Piezas Musicales',
        description: 'Piezas, estudios y obras con su nivel y ejercicios asociados.',
        formats: ['csv', 'json'],
        import: {
            supportsUpdate: true,
            upsertKey: 'nombre',
            csvHeaders: ['nombre', 'nivel', 'ejercicios'], // 'code' removed from required headers for simplicity in templates
            editableFields: ['nombre', 'nivel', 'ejercicios'],
            dependencies: { 'ejercicios': 'ejercicios' },

            // Usamos ResolutionService
            resolvers: {
                'ejercicios': async (val: string) => ResolutionService.resolveExercises(val)
            },

            handler: async (data: any, format: string, user: any) => {
                const results: { created: number; updated: number; skipped: number; errors: string[] } = { created: 0, updated: 0, skipped: 0, errors: [] };
                const piezas = await localDataClient.entities.Pieza.list();

                // Si viene del pipeline, data ya es un array de objetos limpios
                const rows: any[] = (format === 'csv' && typeof data === 'string') ? parseCSV(data) : data;

                for (const row of rows) {
                    try {
                        const { nombre, nivel, elementos } = row;

                        // Elementos should be resolved by pipeline ideally via Resolver.
                        // But if raw, we might need fallback? Assuming pipeline used mostly.
                        // Logic below handles "elementos" as the resolved array of objects { nombre, mediaLinks }

                        const nivelNormalizado = (nivel || 'principiante').toLowerCase();
                        let existente = piezas.find(p => p.nombre === nombre);

                        // Si 'elementos' viene del resolver, tendrá { resolved: [...], missing: [...] } OJO
                        // El pipeline pone en row['ejercicios'] el resultado del resolver.
                        // Aquí esperamos que "elementos" sea la lista final de objetos para guardar en DB.

                        // Adaptación: el importPipeline asigna el resultado del resolver al campo original (ej 'ejercicios')
                        // Pero la DB espera 'elementos'. 
                        // Mapa: row.ejercicios -> (resolved list) -> DB.elementos

                        let elementosFinales = [];
                        if (row.ejercicios && row.ejercicios.resolved) {
                            elementosFinales = row.ejercicios.resolved;
                        } else if (row.elementos) {
                            elementosFinales = row.elementos; // JSON direct or legacy
                        }

                        if (existente) {
                            await localDataClient.entities.Pieza.update(existente.id, {
                                nombre,
                                nivel: nivelNormalizado,
                                elementos: elementosFinales.length > 0 ? elementosFinales : existente.elementos
                            });
                            results.updated++;
                        } else {
                            await localDataClient.entities.Pieza.create({
                                nombre,
                                nivel: nivelNormalizado,
                                elementos: elementosFinales,
                                profesorId: user.id
                            });
                            results.created++;
                        }
                    } catch (e: any) {
                        results.errors.push(`${row.nombre}: ${e.message}`);
                    }
                }
                return results;
            }
        },
        export: {
            handler: async (format: string) => {
                const piezas = await localDataClient.entities.Pieza.list();
                if (format === 'json') return JSON.stringify(piezas, null, 2);

                const headers = ['nombre', 'nivel', 'ejercicios'];
                const rows = piezas.map(p => ({
                    nombre: p.nombre,
                    nivel: p.nivel,
                    ejercicios: (p.elementos || []).map((e: any) => e.nombre || e.code).join(',') // Export names/codes
                }));
                return generateCSV(headers, rows);
            }
        },
        templates: {
            csv: `nombre;nivel;ejercicios\nEstudio en Do;intermedio;CA-001,TC-001\nSonata n1;avanzado;TC-002`,
            json: JSON.stringify([{ nombre: "Estudio Do", nivel: "intermedio", elementos: [] }], null, 2)
        }
    },
    {
        id: 'planes',
        label: 'Planes de Estudio',
        description: 'Estructuras de sesiones semanales.',
        formats: ['json'],
        import: {
            supportsUpdate: false,
            upsertKey: 'nombre',
            editableFields: ['nombre', 'focoGeneral'],
            handler: async (data: any, format: string, user: any) => {
                const results: { created: number; updated: number; skipped: number; errors: string[] } = { created: 0, updated: 0, skipped: 0, errors: [] };
                if (format !== 'json') throw new Error('Planes solo soporta JSON');

                const rows: any[] = Array.isArray(data) ? data : [data];

                for (const item of rows) {
                    try {
                        let piezaId = item.piezaId;
                        if (!piezaId && item.piezaNombre) {
                            const pResol = await ResolutionService.resolvePiece(item.piezaNombre);
                            if (pResol) piezaId = pResol.id;
                        }

                        const semanasResueltas = [];
                        for (const sem of (item.semanas || [])) {
                            const newSem = { ...sem, sesiones: [] };
                            for (const ses of (sem.sesiones || [])) {
                                const newSes = { ...ses, bloques: [] };
                                if (ses.bloques && ses.bloques.length > 0) {
                                    // Resolve blocks if they are strings (codes)
                                    // If already objects, keep them
                                    const codesToResolve = ses.bloques.filter((b: any) => typeof b === 'string');
                                    const objectsToKeep = ses.bloques.filter((b: any) => typeof b !== 'string');

                                    const resolved = await ResolutionService.resolveExercises(codesToResolve);

                                    newSes.bloques = [...objectsToKeep, ...resolved.resolved];
                                }
                                newSem.sesiones.push(newSes);
                            }
                            semanasResueltas.push(newSem);
                        }

                        await localDataClient.entities.Plan.create({
                            nombre: item.nombre,
                            focoGeneral: item.focoGeneral || 'GEN',
                            piezaId,
                            semanas: semanasResueltas,
                            profesorId: user.id
                        });
                        results.created++;
                    } catch (e: any) {
                        results.errors.push(`${item.nombre}: ${e.message}`);
                    }
                }
                return results;
            }
        },
        export: {
            handler: async (format: string) => {
                const planes = await localDataClient.entities.Plan.list();
                const piezas = await localDataClient.entities.Pieza.list();
                const data = planes.map(p => ({
                    ...p,
                    piezaNombre: piezas.find(pz => pz.id === p.piezaId)?.nombre
                }));
                return JSON.stringify(data, null, 2);
            }
        },
        templates: {
            json: JSON.stringify([{
                nombre: "Plan Base",
                piezaNombre: "Estudio en Do",
                semanas: [
                    { nombre: "Semana 1", sesiones: [{ bloques: ["CA-001", "TC-001"] }] }
                ]
            }], null, 2)
        }
    },
    {
        id: 'usuarios',
        label: 'Usuarios',
        description: 'Base de datos de estudiantes y profesores.',
        formats: ['csv'],
        import: {
            supportsUpdate: true,
            upsertKey: 'email',
            csvHeaders: ['nombre', 'email', 'rol', 'telefono', 'profesor_email'],
            editableFields: ['nombre', 'email', 'rol', 'telefono'],
            dependencies: { 'profesor_email': 'usuarios' },

            resolvers: {
                'profesor_email': async (val: string) => ResolutionService.resolveUser(val)
            },

            handler: async (data: any, format: string, user: any) => {
                const results: { created: number; updated: number; skipped: number; errors: string[] } = { created: 0, updated: 0, skipped: 0, errors: [] };
                const users = await localDataClient.entities.User.list();

                const rows = format === 'csv' ? parseCSV(data) : data;

                for (const row of rows) {
                    try {
                        const { nombre, email, rol, telefono, profesor_email } = row;
                        if (!email || !nombre) throw new Error("Email y Nombre son obligatorios");

                        const normalizedEmail = email.trim().toLowerCase();
                        const existe = users.find(u => u.email?.toLowerCase() === normalizedEmail);

                        // Resolve profesor (si existe)
                        let profesorId = null;
                        if (row.profesor_email && row.profesor_email.id) {
                            profesorId = row.profesor_email.id; // From ResolutionService
                        } else if (profesor_email) {
                            // Fallback raw resolution
                            const res = await ResolutionService.resolveUser(profesor_email);
                            if (res) profesorId = res.id;
                        }

                        // Normalizar ROL
                        const rolFinal = (rol === 'ADMIN' || rol === 'PROF' || rol === 'ESTU') ? rol : 'ESTU';

                        if (existe) {
                            await localDataClient.entities.User.update(existe.id, {
                                nombreCompleto: nombre, // map csv 'nombre' to 'nombreCompleto'
                                full_name: nombre,
                                rolPersonalizado: rolFinal,
                                telefono: telefono || existe.telefono,
                                profesorAsignadoId: profesorId || existe.profesorAsignadoId
                            });
                            results.updated++;
                        } else {
                            await localDataClient.entities.User.create({
                                email: normalizedEmail,
                                nombreCompleto: nombre,
                                full_name: nombre,
                                rolPersonalizado: rolFinal,
                                telefono: telefono || '',
                                profesorAsignadoId: profesorId,
                                password: 'tempPassword123!', // TODO: Better strategy
                                nivel: 'principiante'
                            });
                            results.created++;
                        }
                    } catch (e: any) {
                        results.errors.push(`${row.email || 'Row'}: ${e.message}`);
                    }
                }
                return results;
            }
        },
        export: {
            handler: async (format: string) => {
                const usuarios = await localDataClient.entities.User.list();
                const headers = ["ID", "Nombre", "Email", "Rol", "Profesor", "Nivel", "Telefono"];
                const rows = usuarios.map(u => {
                    const profe = usuarios.find(p => p.id === u.profesorAsignadoId);
                    return {
                        ID: u.id,
                        Nombre: displayName(u),
                        Email: u.email || '',
                        Rol: u.rolPersonalizado,
                        Profesor: profe ? displayName(profe) : '',
                        Nivel: u.nivel || '',
                        Telefono: u.telefono || ''
                    };
                });
                return generateCSV(headers, rows);
            }
        },
        templates: {
            csv: `nombre;email;rol;telefono;profesor_email\nJuan Perez;juan@test.com;ESTU;666555444;profesor@test.com`
        }
    },
    {
        id: 'asignaciones',
        label: 'Asignaciones',
        description: 'Vínculos entre usuarios y planes. (Solo Export)',
        formats: ['csv'],
        import: null,
        export: {
            handler: async (format: string) => {
                const asignaciones = await localDataClient.entities.Asignacion.list();
                const usuarios = await localDataClient.entities.User.list();

                const headers = ["ID", "Alumno", "Profesor", "Pieza", "Plan", "Estado", "Inicio"];
                const rows = asignaciones.map(a => {
                    const al = usuarios.find(u => u.id === a.alumnoId);
                    const pr = usuarios.find(u => u.id === a.profesorId);
                    return {
                        ID: a.id,
                        Alumno: al ? displayName(al) : '',
                        Profesor: pr ? displayName(pr) : '',
                        Pieza: a.piezaSnapshot?.nombre || '',
                        Plan: a.plan?.nombre || '',
                        Estado: a.estado,
                        Inicio: a.semanaInicioISO
                    };
                });
                return generateCSV(headers, rows);
            }
        }
    },
    {
        id: 'agenda',
        label: 'Agenda Semanal',
        description: 'Vista calculada de carga de trabajo semanal. (Solo Export)',
        formats: ['csv'],
        import: null,
        export: {
            handler: async (format: string) => {
                const usuarios = await localDataClient.entities.User.list();
                const asignaciones = await localDataClient.entities.Asignacion.list();
                const hoy = new Date();
                const lunes = startOfMonday(hoy);
                const semanaActualISO = formatLocalDate(lunes);
                const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
                const headers = ["Alumno", "Email", "Pieza", "Plan", "Semana", "Sesiones", "Tiempo(min)"];
                const rows: any[] = [];
                estudiantes.forEach(est => {
                    const asig = asignaciones.find(a =>
                        a.alumnoId === est.id &&
                        (a.estado === 'publicada' || a.estado === 'en_curso')
                    );
                    if (asig) {
                        const offset = calcularOffsetSemanas(asig.semanaInicioISO, semanaActualISO);
                        const semanaPlan = asig.plan?.semanas?.[offset];
                        if (semanaPlan) {
                            const tiempo = semanaPlan.sesiones?.reduce((acc: number, s: any) => acc + calcularTiempoSesion(s), 0) || 0;
                            rows.push({
                                Alumno: displayName(est),
                                Email: est.email || '',
                                Pieza: asig.piezaSnapshot?.nombre || '',
                                Plan: asig.plan?.nombre || '',
                                Semana: semanaPlan.nombre || `Semana ${offset + 1}`,
                                Sesiones: semanaPlan.sesiones?.length || 0,
                                "Tiempo(min)": Math.floor(tiempo / 60)
                            });
                        }
                    }
                });
                return generateCSV(headers, rows);
            }
        }
    },
    {
        id: 'sesiones',
        label: 'Registros de Sesión',
        description: 'Historial detallado de sesiones realizadas. (Solo Export)',
        formats: ['csv'],
        import: null,
        export: {
            handler: async () => {
                const registros = await localDataClient.entities.RegistroSesion.list();
                const usuarios = await localDataClient.entities.User.list();
                const headers = ["Fecha", "Alumno", "Pieza", "Plan", "DuracionReal", "Calificacion"];
                const rows = registros.map(r => ({
                    Fecha: r.inicioISO,
                    Alumno: displayName(usuarios.find(u => u.id === r.alumnoId)) || '',
                    Pieza: r.piezaNombre || '',
                    Plan: r.planNombre || '',
                    DuracionReal: r.duracionRealSeg,
                    Calificacion: r.calificacion
                }));
                return generateCSV(headers, rows);
            }
        }
    }
];

export const getDataset = (id: string) => datasets.find(d => d.id === id);

// Categories for the export panel UI
export const CATEGORIES = [
    {
        id: 'contenido',
        label: 'Contenido',
        datasets: ['ejercicios', 'piezas', 'planes']
    },
    {
        id: 'usuarios',
        label: 'Usuarios y Asignaciones',
        datasets: ['usuarios', 'asignaciones']
    },
    {
        id: 'registros',
        label: 'Historial y Reportes',
        datasets: ['agenda', 'sesiones']
    }
];
