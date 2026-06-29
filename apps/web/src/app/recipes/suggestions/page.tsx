"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CircleAlert, Loader2, Search, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { createShoppingListFromRecipes, getProfile, getRecipeSuggestions, readAuthToken } from "@/lib/api";
import { recipeId, RecipePlanningModal } from "@/components/recipes/RecipePlanningModal";
import type { Recipe, RecipeRecommendation, RecipeSuggestion, RecipeSuggestionGroup, RecipeSuggestionResponse, UserProfile } from "@/types/domain";
import { PageScaffold } from "@/components/ui/PageScaffold";

const emptyResponse: RecipeSuggestionResponse = {
  summary: {
    totalRecipesAnalyzed: 0,
    readyToCook: 0,
    highlyRecommended: 0,
    missingFewIngredients: 0,
    lowCompatibility: 0
  },
  suggestions: [],
  groups: {
    readyToCook: [],
    highlyRecommended: [],
    missingFewIngredients: [],
    lowCompatibility: []
  }
};

const recommendationLabels: Record<RecipeRecommendation, string> = {
  cook_now: "Pret a cuisiner",
  almost_ready: "Fortement recommande",
  shopping_needed: "Il manque peu",
  not_recommended: "Peu compatible"
};

const groupLabels: Record<RecipeSuggestionGroup, string> = {
  readyToCook: "Pretes a cuisiner",
  highlyRecommended: "Fortement recommandees",
  missingFewIngredients: "Il manque 1 ou 2 ingredients",
  lowCompatibility: "Peu adaptees"
};

function recipeSource(recipe: Recipe): "api" | "user" | "demo" {
  return recipe.source || (recipe.externalId?.startsWith("demo-") ? "demo" : "user");
}

function detailHref(recipe: Recipe) {
  return `/recipes/${encodeURIComponent(recipeId(recipe))}?source=${encodeURIComponent(recipeSource(recipe))}`;
}

function badgeLabel(suggestion: RecipeSuggestion) {
  if (suggestion.recommendation === "cook_now") return "Pret a cuisiner";
  if (suggestion.missingCount === 1) return "Il manque 1 ingredient";
  if (suggestion.recommendation === "not_recommended") return "Peu compatible";
  return recommendationLabels[suggestion.recommendation];
}

function RecipeCard({
  suggestion,
  token,
  selected,
  onSelect,
  onPlan
}: {
  suggestion: RecipeSuggestion;
  token: string;
  selected: boolean;
  onSelect: (recipe: Recipe, selected: boolean) => void;
  onPlan: (recipe: Recipe) => void;
}) {
  const recipe = suggestion.recipe;
  const missing = [...suggestion.missingIngredients, ...suggestion.partialIngredients];

  return (
    <article className="suggestion-card">
      {recipe.image ? <img src={recipe.image} alt="" /> : <div className="recipe-image-placeholder">Mealizy</div>}
      <div className="suggestion-card-body">
        <div className="suggestion-card-heading">
          <Link href={detailHref(recipe)}><strong>{recipe.title}</strong></Link>
          <span className={`suggestion-badge ${suggestion.group}`}>{badgeLabel(suggestion)}</span>
        </div>
        <label className="suggestion-select">
          <input type="checkbox" checked={selected} onChange={(event) => onSelect(recipe, event.target.checked)} />
          Ajouter a la liste
        </label>
        <div className="suggestion-score-row">
          <strong>{suggestion.score}%</strong>
          <span>{recommendationLabels[suggestion.recommendation]}</span>
        </div>
        <p>{suggestion.explanation}</p>
        {missing.length > 0 ? (
          <ul>
            {missing.slice(0, 4).map((ingredient) => <li key={`${recipeId(recipe)}-${ingredient}`}>{ingredient}</li>)}
          </ul>
        ) : (
          <p>Aucun ingredient manquant.</p>
        )}
        <button className="outline-action" type="button" disabled={!token || !recipeId(recipe)} onClick={() => onPlan(recipe)}>
          <CalendarPlus size={17} /> Ajouter au planning
        </button>
      </div>
    </article>
  );
}

export default function RecipeSuggestionsPage() {
  const router = useRouter();
  const [response, setResponse] = useState<RecipeSuggestionResponse>(emptyResponse);
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState("");
  const [missingMax, setMissingMax] = useState("");
  const [category, setCategory] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [isCreatingShoppingList, setIsCreatingShoppingList] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");

  const suggestions = Array.isArray(response.suggestions) ? response.suggestions : [];
  const groups = response.groups || emptyResponse.groups;
  const topSuggestion = useMemo(() => suggestions[0], [suggestions]);

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
    getRecipeSuggestions(token, {
      q: query,
      minScore,
      missingMax,
      category,
      readyOnly: readyOnly ? "true" : undefined,
      limit: 20
    })
      .then((results) => {
        setResponse(results);
        setSelectedRecipeIds([]);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [category, minScore, missingMax, query, readyOnly, token]);

  function updateSelectedRecipe(recipe: Recipe, selected: boolean) {
    const id = recipeId(recipe);
    setSelectedRecipeIds((current) => selected ? [...new Set([...current, id])] : current.filter((value) => value !== id));
  }

  function createSelectedShoppingList() {
    if (!token || !selectedRecipeIds.length) return;
    setIsCreatingShoppingList(true);
    createShoppingListFromRecipes(token, selectedRecipeIds)
      .then((list) => {
        if (list._id) router.push(`/shopping-lists?id=${encodeURIComponent(list._id)}`);
      })
      .catch(() => setStatus("error"))
      .finally(() => setIsCreatingShoppingList(false));
  }

  return (
    <PageScaffold title="Suggestions intelligentes" description="Recettes triees par score intelligent selon votre inventaire.">
      <section className="recipe-filters" aria-label="Filtres suggestions">
        <div className="search-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une suggestion" /></div>
        <input value={minScore} onChange={(event) => setMinScore(event.target.value)} inputMode="numeric" placeholder="Score min" />
        <input value={missingMax} onChange={(event) => setMissingMax(event.target.value)} inputMode="numeric" placeholder="Manquants max" />
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categorie" />
        <label className="filter-toggle">
          <input type="checkbox" checked={readyOnly} onChange={(event) => setReadyOnly(event.target.checked)} />
          Pret uniquement
        </label>
      </section>

      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement des suggestions</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour voir vos suggestions.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de recuperer les suggestions.</div>}

      {status === "ready" && (
        <>
          <section className="suggestion-summary">
            <div><strong>{response.summary.totalRecipesAnalyzed}</strong><span>analysees</span></div>
            <div><strong>{response.summary.readyToCook}</strong><span>pretes</span></div>
            <div><strong>{response.summary.highlyRecommended}</strong><span>recommandees</span></div>
            <div><strong>{response.summary.missingFewIngredients}</strong><span>presque pretes</span></div>
            <div><strong>{response.summary.lowCompatibility}</strong><span>peu compatibles</span></div>
          </section>

          {topSuggestion && (
            <section className="top-suggestion panel">
              <div>
                <SlidersHorizontal size={20} />
                <h2>Meilleure suggestion</h2>
                <p>{topSuggestion.recipe.title} - {topSuggestion.score}% - {topSuggestion.explanation}</p>
              </div>
              <button className="primary-action" type="button" onClick={() => setSelectedRecipe(topSuggestion.recipe)}>
                <CalendarPlus size={17} /> Planifier
              </button>
            </section>
          )}

          <section className="suggestion-selection-bar">
            <span>{selectedRecipeIds.length} recette{selectedRecipeIds.length > 1 ? "s" : ""} selectionnee{selectedRecipeIds.length > 1 ? "s" : ""}</span>
            <button className="primary-action" type="button" disabled={!selectedRecipeIds.length || isCreatingShoppingList} onClick={createSelectedShoppingList}>
              {isCreatingShoppingList ? <Loader2 size={17} /> : <ShoppingCart size={17} />} Creer une liste
            </button>
          </section>

          {(["readyToCook", "highlyRecommended", "missingFewIngredients", "lowCompatibility"] as RecipeSuggestionGroup[]).map((group) => {
            const groupSuggestions = Array.isArray(groups[group]) ? groups[group] : [];
            if (!groupSuggestions.length) return null;
            return (
              <section className="suggestion-group-section" key={group}>
                <h2>{groupLabels[group]}</h2>
                <div className="suggestion-grid">
                  {groupSuggestions.map((suggestion) => (
                    <RecipeCard
                      key={`${suggestion.recipe.source}-${recipeId(suggestion.recipe)}-${suggestion.recipe.title}`}
                      suggestion={suggestion}
                      token={token}
                      selected={selectedRecipeIds.includes(recipeId(suggestion.recipe))}
                      onSelect={updateSelectedRecipe}
                      onPlan={setSelectedRecipe}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {!suggestions.length && <div className="state-panel">Aucune suggestion ne correspond aux filtres.</div>}
        </>
      )}

      {selectedRecipe && token && (
        <RecipePlanningModal recipe={selectedRecipe} profile={profile} token={token} onClose={() => setSelectedRecipe(null)} />
      )}
    </PageScaffold>
  );
}
