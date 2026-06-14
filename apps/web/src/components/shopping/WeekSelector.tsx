"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function getWeekStart(date = new Date()) {
  const weekStart = new Date(date);
  const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function addWeeks(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  return next;
}

export function formatWeekParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(weekStart: Date) {
  const weekEnd = addWeeks(weekStart, 1);
  weekEnd.setDate(weekEnd.getDate() - 1);

  return `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}`;
}

export function WeekSelector({ weekStart, onChange }: { weekStart: Date; onChange: (weekStart: Date) => void }) {
  return (
    <div className="shopping-week-controls">
      <div className="week-switcher">
        <button type="button" aria-label="Semaine précédente" onClick={() => onChange(addWeeks(weekStart, -1))}>
          <ChevronLeft size={17} />
        </button>
        <span>{formatWeekLabel(weekStart)}</span>
        <button type="button" aria-label="Semaine suivante" onClick={() => onChange(addWeeks(weekStart, 1))}>
          <ChevronRight size={17} />
        </button>
      </div>
      <button type="button" className="outline-action compact-action" onClick={() => onChange(getWeekStart())}>
        Semaine courante
      </button>
    </div>
  );
}
