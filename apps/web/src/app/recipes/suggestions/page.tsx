"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CircleAlert, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { getProfile, getRecipeSuggestions, readAuthToken } from "@/lib/api";
import { recipeId, RecipePlanningModal } from "@/components/recipes/RecipePlanningModal";
import type { Recipe, UserProfile } from "@/types/domain";
import { PageScaffold } from "@/components/ui/PageScaffold";

const coverageOptions = [
  { value: "", label: "Tout" },
  { value: "90", label: "Couverture > 90%" },
  { value: "75", label: "Couverture > 75%" },
  { value: "50", label: "Couverture > 50%" },
  { value: "25", label: "Couverture > 25%" }
];

const categoryOptions = [
  "Viande",
  "Volaille",
  "Poisson",
  "Fruits de mer",
  "Legumes",
  "Feculents",
  "Vegetarien",
  "Vegan",
  "Dessert",
  "Petit dejeuner",
  "Entree",
  "Plat principal",
  "Accompagnement"
];

function recipeSource(recipe: Recipe): "api" | "user" | "demo" {
  return recipe.source || (recipe.externalId?.startsWith("demo-") ? "demo" : "user");
}

function detailHref(recipe: Recipe) {
  return `/recipes/${encodeURIComponent(recipeId(recipe))}?source=${encodeURIComponent(recipeSource(recipe))}`;
}

function RecipeCard({ recipe, token, onPlan }: { recipe: Recipe; token: string; onPlan: (recipe: Recipe) => void }) {
  const missingIngredients = recipe.missingIngredients || [];
  const totalIngredients = recipe.ingredients?.length || (recipe.availableIngredientCount || 0) + (recipe.missingCount || 0);

  return (
    <article className="suggestion-card">
      {recipe.image ? <img src={recipe.image} alt="" /> : <div className="recipe-image-placeholder">Mealizy</div>}
      <div className="suggestion-card-body">
        <div>
          <Link href={detailHref(recipe)}><strong>{recipe.title}</strong></Link>
          <span>{recipe.nutrition?.calories || 0} kcal · {recipe.servings || 1} portions · score {recipe.score || 0}</span>
        </div>
        <p>{recipe.availableIngredientCount || 0}/{totalIngredients || 0} ingredients disponibles · {recipe.coverage || 0}% couverture</p>
        <p>{recipe.missingCount || 0} ingredient{recipe.missingCount === 1 ? "" : "s"} manquant{recipe.missingCount === 1 ? "" : "s"}</p>
        {missingIngredients.length > 0 && (
          <ul>
            {missingIngredients.slice(0, 4).map((ingredient) => (
              <li key={`${recipeId(recipe)}-${ingredient.normalizedName}`}>
                {ingredient.ingredientName} · {ingredient.quantity} {ingredient.unit}
              </li>
            ))}
          </ul>
        )}
        <button className="outline-action" type="button" disabled={!token || !recipeId(recipe)} onClick={() => onPlan(recipe)}>
          <CalendarPlus size={17} /> Ajouter au planning
        </button>
      </div>
    </article>
  );
}

export default function RecipeSuggestionsPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [coverage, setCoverage] = useState("");
  const [category, setCategory] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [minProtein, setMinProtein] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");

  const topRecipe = useMemo(() => recipes[0], [recipes]);

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    if (!authToken) {
      setStatus("missing-token");
      return;
    }
    getProfile(authToken).then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    if (!token) return;
    setStatus("loading");
    getRecipeSuggestions(token, { q: query, coverage, category, maxCalories, minProtein, maxTime })
      .then((results) => {
        setRecipes(results);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [category, coverage, maxCalories, maxTime, minProtein, query, token]);

  return (
    <PageScaffold title="Suggestions" description="Recettes triees par score selon votre inventaire reel.">
      <section className="recipe-filters" aria-label="Filtres suggestions">
        <div className="search-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une suggestion" /></div>
        <select value={coverage} onChange={(event) => setCoverage(event.target.value)}>
          {coverageOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Toutes categories</option>
          {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input value={maxCalories} onChange={(event) => setMaxCalories(event.target.value)} inputMode="numeric" placeholder="Calories max" />
        <input value={minProtein} onChange={(event) => setMinProtein(event.target.value)} inputMode="numeric" placeholder="Proteines min" />
        <input value={maxTime} onChange={(event) => setMaxTime(event.target.value)} inputMode="numeric" placeholder="Temps max" />
      </section>

      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement des suggestions</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour voir vos suggestions.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de recuperer les suggestions.</div>}

      {status === "ready" && (
        <>
          {topRecipe && (
            <section className="top-suggestion panel">
              <div>
                <SlidersHorizontal size={20} />
                <h2>Top suggestion du moment</h2>
                <p>{topRecipe.title} · score {topRecipe.score || 0} · {topRecipe.missingCount || 0} ingredients manquants</p>
              </div>
              <button className="primary-action" type="button" onClick={() => setSelectedRecipe(topRecipe)}>
                <CalendarPlus size={17} /> Planifier
              </button>
            </section>
          )}

          <section className="suggestion-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={`${recipe.source}-${recipeId(recipe)}-${recipe.title}`} recipe={recipe} token={token} onPlan={setSelectedRecipe} />
            ))}
          </section>
          {!recipes.length && <div className="state-panel">Aucune suggestion ne correspond aux filtres.</div>}
        </>
      )}

      {selectedRecipe && token && (
        <RecipePlanningModal recipe={selectedRecipe} profile={profile} token={token} onClose={() => setSelectedRecipe(null)} />
      )}
    </PageScaffold>
  );
}
