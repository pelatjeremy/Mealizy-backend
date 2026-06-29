"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarPlus, ChefHat, ChevronLeft, ChevronRight, CircleAlert, Coffee, Loader2, MoreHorizontal, Moon, Pencil, ShoppingCart, Sun, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { asArray, createMealPlan, deleteMealPlan, generateMealPlanShoppingList, getMealPlans, getProfile, getRecipeSuggestions, readAuthToken, updateMealPlan } from "@/lib/api";
import { formatWeekParam, getWeekStart } from "@/components/shopping/WeekSelector";
import type { MealPlan, MealType, Recipe, RecipeRecommendation, RecipeSuggestion, UserProfile } from "@/types/domain";

const mealRows: { key: MealType; label: string; icon: typeof Coffee }[] = [
  { key: "lunch", label: "Dejeuner", icon: Sun },
  { key: "dinner", label: "Diner", icon: Moon }
];

const recommendationLabels: Record<RecipeRecommendation, string> = {
  cook_now: "Pret a cuisiner",
  almost_ready: "Tres recommande",
  shopping_needed: "Il manque peu",
  not_recommended: "Peu compatible"
};

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

function recipeId(recipe: Recipe) {
  return recipe.externalId || recipe._id || recipe.id || "";
}

function recipeSource(recipe: Recipe): "api" | "user" | "demo" {
  return recipe.source || (recipe.externalId?.startsWith("demo-") ? "demo" : "user");
}

function MealSlot({
  plan,
  date,
  mealType,
  openMenuId,
  onAdd,
  onToggleMenu,
  onCook,
  onDelete,
  onViewRecipe,
  onUpdateServings
}: {
  plan?: MealPlan;
  date: string;
  mealType: MealType;
  openMenuId: string | null;
  onAdd: (date: string, mealType: MealType) => void;
  onToggleMenu: (plan: MealPlan) => void;
  onCook: (plan: MealPlan) => void;
  onDelete: (plan: MealPlan) => void;
  onViewRecipe: (plan: MealPlan) => void;
  onUpdateServings: (plan: MealPlan) => void;
}) {
  if (!plan) {
    return (
      <article className="meal-slot meal-slot-empty">
        <button type="button" onClick={() => onAdd(date, mealType)}>
          <CalendarPlus size={16} /> Ajouter une recette
        </button>
      </article>
    );
  }

  const isMenuOpen = openMenuId === plan._id;
  const score = plan.metadata?.score;
  const recommendation = plan.metadata?.recommendation;

  return (
    <article className="meal-slot planned-slot">
      {plan.recipe?.image && <img src={plan.recipe.image} alt="" />}
      <strong>{plan.recipe?.title || "Recette"}</strong>
      <span>{plan.servings} portions</span>
      {score !== undefined && <span>{score}% - {recommendation ? recommendationLabels[recommendation] : "score"}</span>}
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

function SuggestionPicker({
  token,
  date,
  mealType,
  defaultServings,
  onClose,
  onCreated
}: {
  token: string;
  date: string;
  mealType: MealType;
  defaultServings: number;
  onClose: () => void;
  onCreated: (plan: MealPlan) => void;
}) {
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [servings, setServings] = useState(defaultServings);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");

  useEffect(() => {
    getRecipeSuggestions(token, { limit: 8, missingMax: 2 })
      .then((response) => {
        setSuggestions(asArray<RecipeSuggestion>(response.suggestions));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function chooseSuggestion(suggestion: RecipeSuggestion) {
    setStatus("saving");
    try {
      const plan = await createMealPlan(token, {
        date,
        mealType,
        recipeId: recipeId(suggestion.recipe),
        recipeSource: recipeSource(suggestion.recipe),
        servings,
        metadata: {
          score: suggestion.score,
          recommendation: suggestion.recommendation
        }
      });
      onCreated(plan);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="planning-modal meal-suggestion-modal">
        <header>
          <div>
            <h2>Ajouter une recette</h2>
            <p>{date} - {mealType === "lunch" ? "dejeuner" : "diner"}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        </header>
        <label>Portions<input min="1" type="number" value={servings} onChange={(event) => setServings(Number(event.target.value))} /></label>
        {status === "loading" && <div className="state-panel"><Loader2 size={20} /> Chargement des suggestions</div>}
        {status === "error" && <div className="state-panel"><CircleAlert size={20} /> Impossible de charger les suggestions.</div>}
        {status === "ready" || status === "saving" ? (
          <div className="meal-suggestion-list">
            {suggestions.map((suggestion) => (
              <button key={`${recipeId(suggestion.recipe)}-${suggestion.score}`} type="button" disabled={status === "saving"} onClick={() => chooseSuggestion(suggestion)}>
                <span>
                  <strong>{suggestion.recipe.title}</strong>
                  <small>{suggestion.explanation}</small>
                </span>
                <em>{suggestion.score}%</em>
                <b>{recommendationLabels[suggestion.recommendation]}</b>
              </button>
            ))}
            {!suggestions.length && <p className="form-note">Aucune suggestion disponible.</p>}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function MealPlanner() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [isGeneratingShoppingList, setIsGeneratingShoppingList] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<{ date: string; mealType: MealType } | null>(null);
  const [generatedList, setGeneratedList] = useState<{ id: string; count: number } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");
  const week = formatWeekParam(weekStart);
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const visibleMeals = useMemo(() => {
    const enabledMealTypes = asArray<MealType>(profile?.enabledMealTypes);
    const enabled = enabledMealTypes.length ? enabledMealTypes : mealRows.map((meal) => meal.key);
    const enabledSet = new Set(enabled);
    return mealRows.filter((meal) => enabledSet.has(meal.key) || meal.key === "lunch" || meal.key === "dinner");
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
        setPlans(asArray<MealPlan>(weekPlans));
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
      setPlans((items) => asArray<MealPlan>(items).filter((item) => item._id !== plan._id));
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
      setPlans((items) => asArray<MealPlan>(items).map((item) => (item._id === updated._id ? updated : item)));
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

  async function handleGenerateShoppingList() {
    if (!token) return;
    setIsGeneratingShoppingList(true);
    try {
      const list = await generateMealPlanShoppingList(token, week);
      if (list._id) setGeneratedList({ id: list._id, count: list.items.length });
    } catch {
      setStatus("error");
    } finally {
      setIsGeneratingShoppingList(false);
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
        <button type="button" className="outline-action compact-action" onClick={() => setWeekStart(getWeekStart())}>
          Semaine actuelle
        </button>
        <button type="button" className="primary-action compact-action" disabled={!plans.length || isGeneratingShoppingList} onClick={handleGenerateShoppingList}>
          {isGeneratingShoppingList ? <Loader2 size={17} /> : <ShoppingCart size={17} />} Generer la liste
        </button>
      </div>
      {generatedList && (
        <div className="meal-shopping-success">
          <span>Liste creee avec {generatedList.count} article{generatedList.count > 1 ? "s" : ""}.</span>
          <button type="button" className="outline-action compact-action" onClick={() => router.push(`/shopping-lists?id=${encodeURIComponent(generatedList.id)}`)}>
            Voir la liste
          </button>
        </div>
      )}

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
                    date={date.key}
                    mealType={meal.key}
                    openMenuId={openMenuId}
                    onAdd={(slotDate, slotMealType) => setPickerSlot({ date: slotDate, mealType: slotMealType })}
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
      {pickerSlot && token && (
        <SuggestionPicker
          token={token}
          date={pickerSlot.date}
          mealType={pickerSlot.mealType}
          defaultServings={profile?.householdSize || 2}
          onClose={() => setPickerSlot(null)}
          onCreated={(plan) => {
            setPlans((items) => [...asArray<MealPlan>(items).filter((item) => item._id !== plan._id), plan]);
            setPickerSlot(null);
            setGeneratedList(null);
          }}
        />
      )}
    </section>
  );
}
