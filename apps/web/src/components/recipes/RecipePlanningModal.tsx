"use client";

import { FormEvent, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { createMealPlan, getApiErrorMessage } from "@/lib/api";
import { formatWeekParam, getWeekStart } from "@/components/shopping/WeekSelector";
import type { MealPlanDay, MealType, Recipe, UserProfile } from "@/types/domain";

const days: { key: MealPlanDay; label: string }[] = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" }
];

const mealTypes: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "lunch", label: "Déjeuner" },
  { key: "dinner", label: "Dîner" },
  { key: "snack", label: "Collation" }
];

function recipeSource(recipe: Recipe): "api" | "user" | "demo" {
  if (recipe.source === "api") return "api";
  if (recipe.externalId?.startsWith("demo-")) return "demo";
  return "user";
}

export function recipeId(recipe: Recipe) {
  return recipe.externalId || recipe._id || recipe.id || "";
}

export function RecipePlanningModal({
  recipe,
  profile,
  token,
  onClose
}: {
  recipe: Recipe;
  profile: UserProfile | null;
  token: string;
  onClose: () => void;
}) {
  const enabledMealTypes = profile?.enabledMealTypes?.length ? profile.enabledMealTypes : mealTypes.map((meal) => meal.key);
  const visibleMealTypes = mealTypes.filter((meal) => enabledMealTypes.includes(meal.key));
  const [weekStartDate, setWeekStartDate] = useState(() => formatWeekParam(getWeekStart()));
  const [day, setDay] = useState<MealPlanDay>("monday");
  const [mealType, setMealType] = useState<MealType>(visibleMealTypes[0]?.key || "lunch");
  const [servings, setServings] = useState(profile?.householdSize || recipe.servings || 1);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");
    try {
      await createMealPlan(token, {
        weekStartDate,
        day,
        mealType,
        recipeId: recipeId(recipe),
        recipeSource: recipeSource(recipe),
        servings
      });
      setStatus("saved");
      window.setTimeout(onClose, 650);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, "Impossible d'ajouter ce repas."));
      setStatus("error");
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="planning-modal" onSubmit={handleSubmit}>
        <header>
          <div>
            <h2>Ajouter au planning</h2>
            <p>{recipe.title}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        </header>
        <label>Semaine<input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} /></label>
        <label>Jour
          <select value={day} onChange={(event) => setDay(event.target.value as MealPlanDay)}>
            {days.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label>Type de repas
          <select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>
            {visibleMealTypes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label>Portions<input min="1" type="number" value={servings} onChange={(event) => setServings(Number(event.target.value))} /></label>
        <button className="primary-action" type="submit" disabled={status === "saving"}><CalendarPlus size={17} /> Enregistrer</button>
        {status === "saved" && <p className="form-note ready">Repas ajouté.</p>}
        {status === "error" && <p className="form-note danger">{error}</p>}
      </form>
    </div>
  );
}
