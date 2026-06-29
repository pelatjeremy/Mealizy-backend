"use client";

import { FormEvent, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { asArray, createMealPlan, getApiErrorMessage } from "@/lib/api";
import { formatWeekParam } from "@/components/shopping/WeekSelector";
import type { MealType, Recipe, UserProfile } from "@/types/domain";

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

function todayParam() {
  return formatWeekParam(new Date());
}

function formatDayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
  const profileMealTypes = asArray<MealType>(profile?.enabledMealTypes);
  const enabledMealTypes = profileMealTypes.length ? profileMealTypes : mealTypes.map((meal) => meal.key);
  const visibleMealTypes = mealTypes.filter((meal) => enabledMealTypes.includes(meal.key));
  const [date, setDate] = useState(todayParam);
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
        date,
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
        <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <p className="form-note">{formatDayLabel(date)}</p>
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
