"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Search, X } from "lucide-react";
import { createMealPlan, getProfile, readAuthToken } from "@/lib/api";
import { recipes } from "@/lib/demo-data";
import type { MealPlanDay, MealType, Recipe, UserProfile } from "@/types/domain";
import { PageScaffold } from "@/components/ui/PageScaffold";

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
  { key: "breakfast", label: "Petit-dejeuner" },
  { key: "lunch", label: "Dejeuner" },
  { key: "dinner", label: "Diner" },
  { key: "snack", label: "Collation" }
];

function getMonday() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function recipeSource(recipe: Recipe): "api" | "user" | "demo" {
  return recipe.source || (recipe.externalId?.startsWith("demo-") ? "demo" : "user");
}

function recipeId(recipe: Recipe) {
  return recipe.externalId || recipe._id || recipe.id || "";
}

function PlanningModal({
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
  const [weekStartDate, setWeekStartDate] = useState(getMonday());
  const [day, setDay] = useState<MealPlanDay>("monday");
  const [mealType, setMealType] = useState<MealType>(visibleMealTypes[0]?.key || "lunch");
  const [servings, setServings] = useState(profile?.householdSize || recipe.servings || 1);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
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
    } catch {
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
        {status === "saved" && <p className="form-note ready">Repas ajoute.</p>}
        {status === "error" && <p className="form-note danger">Impossible d'ajouter ce repas.</p>}
      </form>
    </div>
  );
}

export default function RecipesPage() {
  const [query, setQuery] = useState("");
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => recipe.title.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  }, [query]);

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    if (!authToken) return;
    getProfile(authToken).then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <PageScaffold title="Recettes" description="Explorez les recettes compatibles avec votre inventaire et vos equipements.">
      <div className="search-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une recette ou un ingredient" /></div>
      {!token && <div className="state-panel">Connectez-vous pour ajouter une recette au planning.</div>}
      <section className="recipe-catalog">
        {filteredRecipes.map((recipe) => (
          <article className="recipe-card" key={recipe.externalId}>
            <img src={recipe.image} alt="" />
            <div>
              <strong>{recipe.title}</strong>
              <span>{recipe.preparationTime} min · {recipe.nutrition.calories} kcal · {recipe.servings} portions</span>
              <button className="outline-action" type="button" disabled={!token} onClick={() => setSelectedRecipe(recipe)}>
                <CalendarPlus size={17} /> Ajouter au planning
              </button>
            </div>
          </article>
        ))}
      </section>
      {selectedRecipe && token && (
        <PlanningModal recipe={selectedRecipe} profile={profile} token={token} onClose={() => setSelectedRecipe(null)} />
      )}
    </PageScaffold>
  );
}
