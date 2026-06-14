"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Apple, ChevronLeft, ChevronRight, CircleAlert, Coffee, Loader2, Moon, Pencil, Sun, Trash2 } from "lucide-react";
import { deleteMealPlan, getMealPlans, getProfile, readAuthToken, updateMealPlan } from "@/lib/api";
import type { MealPlan, MealPlanDay, MealType, UserProfile } from "@/types/domain";

const dayKeys: MealPlanDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabels = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const mealRows: { key: MealType; label: string; icon: typeof Coffee }[] = [
  { key: "breakfast", label: "Petit-dejeuner", icon: Coffee },
  { key: "lunch", label: "Dejeuner", icon: Sun },
  { key: "dinner", label: "Diner", icon: Moon },
  { key: "snack", label: "Collation", icon: Apple }
];

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonday(date = new Date()) {
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addWeeks(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  return next;
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addWeeks(weekStart, 1);
  weekEnd.setDate(weekEnd.getDate() - 1);

  return `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}`;
}

function planKey(day: MealPlanDay, mealType: MealType) {
  return `${day}:${mealType}`;
}

function MealSlot({
  plan,
  onDelete,
  onUpdateServings
}: {
  plan?: MealPlan;
  onDelete: (plan: MealPlan) => void;
  onUpdateServings: (plan: MealPlan) => void;
}) {
  if (!plan) return <article className="meal-slot meal-slot-empty">Disponible</article>;

  return (
    <article className="meal-slot planned-slot">
      {plan.recipe?.image && <img src={plan.recipe.image} alt="" />}
      <strong>{plan.recipe?.title || "Recette"}</strong>
      <span>{plan.recipe?.preparationTime || 0} min</span>
      <span>{plan.recipe?.calories || 0} kcal</span>
      <span>{plan.servings} portions</span>
      <div className="meal-actions">
        <button type="button" aria-label="Modifier les portions" onClick={() => onUpdateServings(plan)}>
          <Pencil size={15} />
        </button>
        <button type="button" aria-label="Supprimer le repas" onClick={() => onDelete(plan)}>
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}

export function MealPlanner() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [weekStart, setWeekStart] = useState(() => getMonday());
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");
  const week = formatDateInput(weekStart);

  const visibleMeals = useMemo(() => {
    const enabled = profile?.enabledMealTypes?.length ? profile.enabledMealTypes : mealRows.map((meal) => meal.key);
    return mealRows.filter((meal) => enabled.includes(meal.key));
  }, [profile]);

  const planMap = useMemo(() => {
    return plans.reduce<Record<string, MealPlan>>((map, plan) => {
      map[planKey(plan.day, plan.mealType)] = plan;
      return map;
    }, {});
  }, [plans]);

  const loadWeek = useCallback(
    async (authToken: string) => {
      setStatus("loading");
      try {
        const [userProfile, weekPlans] = await Promise.all([getProfile(authToken), getMealPlans(authToken, week)]);
        setProfile(userProfile);
        setPlans(weekPlans);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [week]
  );

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    if (!authToken) {
      setStatus("missing-token");
      return;
    }
    loadWeek(authToken);
  }, [loadWeek]);

  async function handleDelete(plan: MealPlan) {
    if (!token) return;
    try {
      await deleteMealPlan(token, plan._id);
      setPlans((items) => items.filter((item) => item._id !== plan._id));
    } catch {
      setStatus("error");
    }
  }

  async function handleUpdateServings(plan: MealPlan) {
    if (!token) return;
    const value = window.prompt("Nombre de portions", String(plan.servings));
    if (!value) return;

    try {
      const updated = await updateMealPlan(token, plan._id, { servings: Number(value) });
      setPlans((items) => items.map((item) => (item._id === updated._id ? updated : item)));
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="panel meal-panel">
      <div className="panel-header">
        <h2>Planning des repas</h2>
        <div className="week-switcher">
          <button type="button" aria-label="Semaine precedente" onClick={() => setWeekStart((date) => addWeeks(date, -1))}>
            <ChevronLeft size={17} />
          </button>
          <span>{formatWeekRange(weekStart)}</span>
          <button type="button" aria-label="Semaine suivante" onClick={() => setWeekStart((date) => addWeeks(date, 1))}>
            <ChevronRight size={17} />
          </button>
        </div>
        <button type="button" className="outline-action compact-action" onClick={() => setWeekStart(getMonday())}>
          Semaine actuelle
        </button>
      </div>

      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement du planning</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour voir votre planning.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de recuperer le planning.</div>}

      {status === "ready" && (
        <>
          {plans.length === 0 && <div className="state-panel">Aucun repas planifie pour cette semaine.</div>}
          <div className="meal-grid full-meal-grid">
            <div className="grid-spacer" />
            {dayLabels.map((day) => <strong className="day-label" key={day}>{day}</strong>)}
            {visibleMeals.map((meal) => (
              <Fragment key={meal.key}>
                <div className="meal-label">
                  <meal.icon size={22} />
                  <span>{meal.label}</span>
                </div>
                {dayKeys.map((day) => (
                  <MealSlot
                    key={planKey(day, meal.key)}
                    plan={planMap[planKey(day, meal.key)]}
                    onDelete={handleDelete}
                    onUpdateServings={handleUpdateServings}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
