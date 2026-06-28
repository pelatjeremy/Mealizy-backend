"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Apple, BookOpen, ChefHat, ChevronLeft, ChevronRight, CircleAlert, Coffee, Loader2, MoreHorizontal, Moon, Pencil, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteMealPlan, getMealPlans, getProfile, readAuthToken, updateMealPlan } from "@/lib/api";
import { formatWeekParam, getWeekStart } from "@/components/shopping/WeekSelector";
import type { MealPlan, MealType, UserProfile } from "@/types/domain";

const mealRows: { key: MealType; label: string; icon: typeof Coffee }[] = [
  { key: "breakfast", label: "Petit-dejeuner", icon: Coffee },
  { key: "lunch", label: "Dejeuner", icon: Sun },
  { key: "dinner", label: "Diner", icon: Moon },
  { key: "snack", label: "Collation", icon: Apple }
];

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

function weekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return {
      key: formatWeekParam(date),
      label: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })
    };
  });
}

function planKey(date: string, mealType: MealType) {
  return `${date}:${mealType}`;
}

function MealSlot({
  plan,
  openMenuId,
  onToggleMenu,
  onCook,
  onDelete,
  onViewRecipe,
  onUpdateServings
}: {
  plan?: MealPlan;
  openMenuId: string | null;
  onToggleMenu: (plan: MealPlan) => void;
  onCook: (plan: MealPlan) => void;
  onDelete: (plan: MealPlan) => void;
  onViewRecipe: (plan: MealPlan) => void;
  onUpdateServings: (plan: MealPlan) => void;
}) {
  if (!plan) return <article className="meal-slot meal-slot-empty">Disponible</article>;

  const isMenuOpen = openMenuId === plan._id;

  return (
    <article className="meal-slot planned-slot">
      {plan.recipe?.image && <img src={plan.recipe.image} alt="" />}
      <strong>{plan.recipe?.title || "Recette"}</strong>
      <span>{plan.recipe?.preparationTime || 0} min</span>
      <span>{plan.recipe?.calories || 0} kcal</span>
      <span>{plan.servings} portions</span>
      <div className="meal-actions">
        <button type="button" aria-label="Actions du repas" aria-expanded={isMenuOpen} onClick={() => onToggleMenu(plan)}>
          <MoreHorizontal size={16} />
        </button>
        {isMenuOpen && (
          <div className="meal-actions-menu">
            <button type="button" onClick={() => onCook(plan)}><ChefHat size={15} /> Cuisiner</button>
            <button type="button" onClick={() => onViewRecipe(plan)}><BookOpen size={15} /> Voir la recette</button>
            <button type="button" onClick={() => onUpdateServings(plan)}><Pencil size={15} /> Modifier les portions</button>
            <button type="button" onClick={() => onDelete(plan)}><Trash2 size={15} /> Supprimer du planning</button>
          </div>
        )}
      </div>
    </article>
  );
}

export function MealPlanner() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");
  const week = formatWeekParam(weekStart);
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const visibleMeals = useMemo(() => {
    const enabled = profile?.enabledMealTypes?.length ? profile.enabledMealTypes : mealRows.map((meal) => meal.key);
    return mealRows.filter((meal) => enabled.includes(meal.key));
  }, [profile]);

  const planMap = useMemo(() => {
    return plans.reduce<Record<string, MealPlan>>((map, plan) => {
      map[planKey(plan.date, plan.mealType)] = plan;
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
      setOpenMenuId(null);
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
      setOpenMenuId(null);
    } catch {
      setStatus("error");
    }
  }

  function handleToggleMenu(plan: MealPlan) {
    setOpenMenuId((current) => (current === plan._id ? null : plan._id));
  }

  function handleViewRecipe(plan: MealPlan) {
    const recipeId = plan.recipe?.id || plan.recipeId;
    if (!recipeId) return;
    setOpenMenuId(null);
    router.push(`/recipes/${encodeURIComponent(recipeId)}?source=${encodeURIComponent(plan.recipeSource)}`);
  }

  function handleCook(plan: MealPlan) {
    setOpenMenuId(null);
    handleViewRecipe(plan);
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
        <button type="button" className="outline-action compact-action" onClick={() => setWeekStart(getWeekStart())}>
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
            {dates.map((date) => <strong className="day-label" key={date.key}>{date.label}</strong>)}
            {visibleMeals.map((meal) => (
              <Fragment key={meal.key}>
                <div className="meal-label">
                  <meal.icon size={22} />
                  <span>{meal.label}</span>
                </div>
                {dates.map((date) => (
                  <MealSlot
                    key={planKey(date.key, meal.key)}
                    plan={planMap[planKey(date.key, meal.key)]}
                    openMenuId={openMenuId}
                    onToggleMenu={handleToggleMenu}
                    onCook={handleCook}
                    onDelete={handleDelete}
                    onViewRecipe={handleViewRecipe}
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
