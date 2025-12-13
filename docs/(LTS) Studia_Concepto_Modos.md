---
tipo: especificacion_funcional
area: Studia
status: borrador
---

# Studia: Lógica de Modos de Ejercicio (Completo vs Repaso)

> **Problema:** En cursos avanzados (GP), el repertorio técnico se acumula. No hay tiempo para tocar *todos* los ejercicios *enteros* cada día.
> **Solución:** Implementar un **ciclo de vida del ejercicio** mediante dos modos de visualización.

---

## 1. Definición de Modos

### A. Modo Completo (Full Mode)
*   **Qué es:** Se muestra la partitura completa (Página entera o ejercicio entero).
*   **Caso de Uso:**
    *   **Aprendizaje:** Cuando el alumno está aprendiendo el ejercicio (Fase "Deep").
    *   **Flow:** Cuando queremos trabajar resistencia/continuidad sobre una pieza entera.
*   **Asset:** 1 Archivo (PDF o Imagen High-Res completa).

### B. Modo Repaso / Aleatorio (Shuffle Mode)
*   **Qué es:** El ejercicio se divide en *fragmentos lógicos* (ej. sistemas, variaciones, tonalidades). El sistema elige **UNO** al azar y lo muestra.
*   **Caso de Uso:**
    *   **Mantenimiento:** El ejercicio ya está dominado. Solo queremos "refrescar" la memoria muscular o la habilidad, sin gastar 5 minutos en tocarlo entero.
    *   **Test Ciego:** Evaluar reacción ante estímulos aleatorios.
*   **Assets:** Varios archivos asociados al mismo ID de ejercicio (Sufijos `_a`, `_b`, `_c`...).

---

## 2. Aplicación en el Algoritmo de Sesión (Ejemplo GP1)

Imagina el ejercicio **Colin 4 (Flexibilidad de Labio)**.
*   *Duración Completo:* 3-4 minutos.
*   *Duración Fragmento (1 sistema):* 30 segundos.

### Escenario 1: Fase de Estudio (Semana 1)
*   **Algoritmo:** Asigna `Colin 4` en **[MODO COMPLETO]**.
*   **Instrucción:** "Estudia el ejercicio entero prestando atención a los saltos."
*   **Tiempo Sesión:** 5 min.

### Escenario 2: Fase de Mantenimiento (Semana 4)
*   *Contexto:* Ya estamos estudiando otros ejercicios nuevos (ej. Colin 6), pero no queremos perder el Colin 4.
*   **Algoritmo:** Asigna `Colin 4` en **[MODO REPASO]**.
*   **Sistema:** Selecciona aleatoriamente `Colin_4_sistema3.png`.
*   **Instrucción:** "Toca este fragmento perfecto a la primera. Mantenimiento."
*   **Tiempo Sesión:** 45 segundos.

---

## 3. Impacto Técnico (Data Model)

Para soportar esto, necesitamos ajustar la estructura de la BD de `ejercicios`.

```json
{
  "id": "TC-COL-0004",
  "titulo": "Colin Advanced Lip Flexibilities #4",
  "tipo_visualizacion": "hibrido", // simple | compuesto
  "assets": {
    "full": "url/a/colin_04_full.png",
    "fragments": [
      "url/a/colin_04_a.png",
      "url/a/colin_04_b.png",
      "url/a/colin_04_c.png"
    ]
  }
}
```

### Reglas del Generador de Sesión
1.  Si `status` del ejercicio es "Learning" -> `Play Mode = FULL`.
2.  Si `status` del ejercicio es "Mastered" -> `Play Mode = SHUFFLE` (Random 1 fragment).

---

## 4. Conclusión
Esta funcionalidad es la **clave pedagógica** para que Studia funcione en Grado Profesional sin colapsar el horario del alumno. Permite mantener un repertorio activo de 50 ejercicios gastando el tiempo de solo 10.
