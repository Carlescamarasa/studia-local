import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";

const pad2 = (n) => String(n).padStart(2, "0");
const parseLocalDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const getISOWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNum;
};

export default function WeekNavigator({ mondayISO, onPrev, onNext, onToday }) {
  const [debounceTimer, setDebounceTimer] = useState(null);

  const handleDebounced = useCallback((action) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      action();
    }, 100);
    setDebounceTimer(timer);
  }, [debounceTimer]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleDebounced(onPrev);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleDebounced(onNext);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onToday();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [onPrev, onNext, onToday, handleDebounced, debounceTimer]);

  const monday = parseLocalDate(mondayISO);
  const weekNumber = getISOWeekNumber(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return (
    <Card className={`rounded-2xl border-[var(--color-border-default)] shadow-sm ${componentStyles.containers.cardBase} p-4 md:p-6 w-full`}>
      <div className="text-center mb-3 md:mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
          <span className="text-sm md:text-base font-semibold text-[var(--color-text-primary)]">Semana {weekNumber}</span>
        </div>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)]">
          {monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      
      <div className="flex gap-2 md:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className={`flex-1 h-9 md:h-10 ${componentStyles.buttons.outline}`}
          aria-label="Semana anterior (←)"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden md:inline ml-1">Anterior</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className={`flex-1 h-9 md:h-10 ${componentStyles.buttons.outline}`}
          aria-label="Ir a semana actual (S)"
        >
          Hoy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          className={`flex-1 h-9 md:h-10 ${componentStyles.buttons.outline}`}
          aria-label="Semana siguiente (→)"
        >
          <span className="hidden md:inline mr-1">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}