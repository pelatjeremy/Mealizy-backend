"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { getProfile, getRecipeCatalog, readAuthToken } from "@/lib/api";
import { recipeId, RecipePlanningModal } from "@/components/recipes/RecipePlanningModal";
import { PageScaffold } from "@/components/ui/PageScaffold";
import type { Recipe, RecipeCatalogSource, UserProfile } from "@/types/domain";

const tabs: { key: RecipeCatalogSource; label: string }[] = [
  { key: "mine", label: "Mes recettes" },
  { key: "mealizy", label: "Recettes Mealizy" },
  { key: "api", label: "Recettes API" }
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
  if (recipe.source === "api") return "api";
  if (recipe.externalId?.startsWith("demo-")) return "demo";
  return "user";
}

function fallbackLabel(reason: string) {
  if (reason === "quota_exceeded") return "Le quota Spoonacular est atteint. Les recettes Mealizy sont affichees temporairement.";
  if (reason === "invalid_key") return "Spoonacular est indisponible en raison de sa configuration. Les recettes Mealizy sont affichees temporairement.";
  return "Spoonacular est momentanement indisponible. Les recettes Mealizy sont affichees temporairement.";
}

function detailHref(recipe: Recipe) {
  const id = recipeId(recipe);
  return `/recipes/${encodeURIComponent(id)}?source=${encodeURIComponent(recipeSource(recipe))}`;
}

function RecipeCard({ recipe, token, onPlan }: { recipe: Recipe; token: string; onPlan: (recipe: Recipe) => void }) {
  return (
    <article className="recipe-card">
      {recipe.image ? <img src={recipe.image} alt="" /> : <div className="recipe-image-placeholder">Mealizy</div>}
      <div>
        <Link href={detailHref(recipe)}><strong>{recipe.title}</strong></Link>
        <span>{recipe.preparationTime || 0} min · {recipe.nutrition?.calories || 0} kcal · {recipe.servings || 1} portions</span>
        <button className="outline-action" type="button" disabled={!token || !recipeId(recipe)} onClick={() => onPlan(recipe)}>
          <CalendarPlus size={17} /> Ajouter au planning
        </button>
      </div>
    </article>
  );
}

export default function RecipesPage() {
  const [source, setSource] = useState<RecipeCatalogSource>("mine");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [minProtein, setMinProtein] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [maxIngredients, setMaxIngredients] = useState("");
  const [page, setPage] = useState(1);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [fallbackReason, setFallbackReason] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");

  const totalPages = useMemo(() => Math.max(Math.ceil(total / 12), 1), [total]);

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
    setFallbackReason("");
    getRecipeCatalog(token, {
      source,
      q: query,
      category,
      maxCalories,
      minProtein,
      maxTime,
      maxIngredients,
      page,
      limit: 12
    })
      .then((result) => {
        setRecipes(result.items);
        setTotal(result.total);
        setFallbackReason(result.fallback?.active ? result.fallback.reason : "");
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [category, maxCalories, maxIngredients, maxTime, minProtein, page, query, source, token]);

  function updateSource(nextSource: RecipeCatalogSource) {
    setSource(nextSource);
    setPage(1);
  }

  return (
    <PageScaffold title="Recettes" description="Catalogue unifie entre vos recettes, Mealizy et Spoonacular.">
      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button key={tab.key} className={source === tab.key ? "active" : ""} type="button" onClick={() => updateSource(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      <section className="recipe-filters" aria-label="Filtres recettes">
        <div className="search-bar"><Search size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Rechercher une recette" /></div>
        <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="">Toutes categories</option>
          {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input value={maxCalories} onChange={(event) => setMaxCalories(event.target.value)} inputMode="numeric" placeholder="Calories max" />
        <input value={minProtein} onChange={(event) => setMinProtein(event.target.value)} inputMode="numeric" placeholder="Proteines min" />
        <input value={maxTime} onChange={(event) => setMaxTime(event.target.value)} inputMode="numeric" placeholder="Temps max" />
        <input value={maxIngredients} onChange={(event) => setMaxIngredients(event.target.value)} inputMode="numeric" placeholder="Ingredients max" />
      </section>

      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement des recettes</div>}
      {status === "missing-token" && <div className="state-panel">Connectez-vous pour consulter le catalogue et planifier vos repas.</div>}
      {status === "error" && <div className="state-panel">Impossible de charger les recettes.</div>}
      {status === "ready" && fallbackReason && <div className="state-panel">{fallbackLabel(fallbackReason)}</div>}

      {status === "ready" && (
        <>
          <section className="recipe-catalog">
            {recipes.map((recipe) => (
              <RecipeCard key={`${recipe.source}-${recipeId(recipe)}-${recipe.title}`} recipe={recipe} token={token} onPlan={setSelectedRecipe} />
            ))}
          </section>
          {!recipes.length && <div className="state-panel">Aucune recette ne correspond aux filtres.</div>}
          <div className="pagination">
            <button className="outline-action compact-action" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>
              <ChevronLeft size={17} /> Precedent
            </button>
            <span>Page {page} / {totalPages}</span>
            <button className="outline-action compact-action" type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Suivant <ChevronRight size={17} />
            </button>
          </div>
        </>
      )}

      {selectedRecipe && token && (
        <RecipePlanningModal recipe={selectedRecipe} profile={profile} token={token} onClose={() => setSelectedRecipe(null)} />
      )}
    </PageScaffold>
  );
}
