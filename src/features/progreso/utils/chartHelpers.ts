import { formatLocalDate, parseLocalDate, startOfMonday } from "./progresoUtils";

/**
 * Normaliza un número (manejo de nulls/NaN)
 */
function safeNum(n: any): number {
    if (n === null || n === undefined) return 0;
    const p = parseFloat(n);
    return isNaN(p) ? 0 : p;
}

/**
 * Genera una serie diaria completa (con ceros) entre start y end.
 */
export function buildDailySeries(rawData: any[], start?: string | Date, end?: string | Date) {
    if (!rawData || rawData.length === 0) return [];

    let dStart: any = typeof start === 'string' ? parseLocalDate(start) : start;
    let dEnd: any = typeof end === 'string' ? parseLocalDate(end) : end;

    // Si faltan fechas (ej: modo "Todo"), inferirlas de los datos
    if (!dStart || !dEnd) {
        const timestamps = rawData
            .map((r: any) => r.inicioISO ? new Date(r.inicioISO).getTime() : null)
            .filter((t: number | null): t is number => t !== null && !isNaN(t));

        if (timestamps.length === 0) return [];

        if (!dStart) dStart = new Date(Math.min(...timestamps));
        if (!dEnd) dEnd = new Date(Math.max(...timestamps));
    }

    // Normalizar a inicio del día
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return []; // Safety check

    dStart = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
    dEnd = new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate());

    // Mapa para acceso rápido por fecha
    const dataMap: Record<string, any> = {};
    rawData.forEach((r: any) => {
        if (!r.inicioISO) return;
        const d = new Date(r.inicioISO);
        // Ajustar a local YYYY-MM-DD
        const localD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const k = formatLocalDate(localD);

        if (!dataMap[k]) {
            dataMap[k] = {
                tiempo: 0,
                sesiones: 0,
                completados: 0,
                omitidos: 0,
                valoraciones: []
            };
        }

        // Acumular métricas
        dataMap[k].tiempo += safeNum(r.duracionRealSeg);
        dataMap[k].sesiones += 1;
        dataMap[k].completados += safeNum(r.bloquesCompletados);
        dataMap[k].omitidos += safeNum(r.bloquesOmitidos);
        if (r.calificacion && r.calificacion > 0) {
            dataMap[k].valoraciones.push(safeNum(r.calificacion));
        }
    });

    // Rellenar todos los días del rango
    const series = [];
    const current = new Date(dStart);

    // Seguridad para loop infinito (max 5 años)
    let safety = 0;
    while (current <= dEnd && safety < 1825) {
        const k = formatLocalDate(current);
        const entry = dataMap[k] || {
            tiempo: 0, sessions: 0, completados: 0, omitidos: 0, valoraciones: []
        };

        // Calcular promedio valoración para el día (si hay)
        let satisfaccion = null;
        if (entry.valoraciones && entry.valoraciones.length > 0) {
            const sum = entry.valoraciones.reduce((a: number, b: number) => a + b, 0);
            satisfaccion = sum / entry.valoraciones.length;
        }

        series.push({
            fecha: k,
            timestamp: current.getTime(), // útil para ordenar/filtrar
            tiempo: entry.tiempo || 0, // En segundos, para formateo preciso
            sesiones: entry.sesiones || 0,
            completados: entry.completados || 0,
            omitidos: entry.omitidos || 0,
            satisfaccion: satisfaccion
        });

        current.setDate(current.getDate() + 1);
        safety++;
    }

    return series;
}

/**
 * Decide la estrategia de agrupación basada en la duración en días.
 */
export function chooseBucket(start: string | Date | null, end: string | Date | null) {
    if (!start || !end) return { mode: 'dia', label: 'Día' };

    const dStart = typeof start === 'string' ? parseLocalDate(start) : start;
    const dEnd = typeof end === 'string' ? parseLocalDate(end) : end;

    const diffTime = Math.abs((dEnd as any) - (dStart as any));
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 inclusive

    if (days <= 60) return { mode: 'dia', label: 'Día' };
    // Extendemos un poco 'dia' hasta 60 para aprovechar que quitamos dots

    if (days <= 120) return { mode: 'semana', label: 'Semana' };

    if (days <= 365) return { mode: 'quincena', label: 'Quincena' };

    return { mode: 'mes', label: 'Mes' };
}

/**
 * Agrega la serie diaria según el bucket especificado.
 */
export function aggregateData(dailySeries: any[], bucketMode: string) {
    if (!bucketMode || bucketMode === 'dia' || bucketMode === 'dia_compacto') {
        return dailySeries;
    }

    const groups: Record<string, any> = {};

    dailySeries.forEach((item: any) => {
        const d = parseLocalDate(item.fecha);
        let key;
        let labelLong; // Para tooltip "Del X al Y"

        if (bucketMode === 'semana') {
            const monday = startOfMonday(d);
            key = formatLocalDate(monday);
        } else if (bucketMode === 'quincena') {
            // Lógica quincena: 1-15 y 16-fin
            const year = d.getFullYear();
            const month = d.getMonth();
            const day = d.getDate();
            if (day <= 15) {
                key = formatLocalDate(new Date(year, month, 1)); // 1st
            } else {
                key = formatLocalDate(new Date(year, month, 16)); // 16th
            }
        } else if (bucketMode === 'mes') {
            key = formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
        } else {
            key = item.fecha;
        }

        if (!groups[key]) {
            groups[key] = {
                key,
                startDate: d, // Se actualizará con min
                endDate: d,   // Se actualizará con max
                items: []
            };
        }

        // Track min/max date para el label del rango
        if (d < groups[key].startDate) groups[key].startDate = d;
        if (d > groups[key].endDate) groups[key].endDate = d;

        groups[key].items.push(item);
    });

    // Procesar grupos
    return Object.values(groups).map((g: any) => {
        const count = g.items.length;
        const totalTiempo = g.items.reduce((sum: number, i: any) => sum + i.tiempo, 0);
        const totalSesiones = g.items.reduce((sum: number, i: any) => sum + i.sesiones, 0);
        const totalCompletados = g.items.reduce((sum: number, i: any) => sum + i.completados, 0);
        const totalOmitidos = g.items.reduce((sum: number, i: any) => sum + i.omitidos, 0);

        // Valoración: promedio ponderado? No, promedio de los días que tienen valoración
        // O promedio de todas las sesiones individuales. 
        // Como ya tenemos promedio por día, haremos promedio de los promedios (simple)
        // para simplificar, o mejor: recuperar valoraciones raw si fuera posible.
        // Dado que solo tenemos dailySeries, haremos promedio de los dias con valor.
        const diasConValor = g.items.filter((i: any) => i.satisfaccion !== null);
        let avgSat = null;
        if (diasConValor.length > 0) {
            avgSat = diasConValor.reduce((sum: number, i: any) => sum + i.satisfaccion, 0) / diasConValor.length;
        }

        // Formatear label rango para tooltip
        // Ej: "1 oct - 7 oct"
        // toLocaleDateString es un poco verbose por defecto, usaremos algo corto
        const startStr = g.startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const endStr = g.endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const rangeLabel = startStr === endStr ? startStr : `${startStr} - ${endStr}`;

        return {
            fecha: g.key, // Identificador para eje X (ej. lunes de la semana)
            fechaLabel: rangeLabel, // Para tooltip
            tiempo: totalTiempo,
            sesiones: totalSesiones,
            completados: totalCompletados,
            omitidos: totalOmitidos,
            satisfaccion: avgSat ? parseFloat(avgSat.toFixed(1)) : null
        };
    }).sort((a, b) => a.fecha.localeCompare(b.fecha));
}
