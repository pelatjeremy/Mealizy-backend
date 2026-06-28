"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getRecipeCatalog, importSpoonacularRecipe, readAuthToken } from "@/lib/api";
import { recipeId, RecipePlanningModal } from "@/components/recipes/RecipePlanningModal";
import { PageScaffold } from "@/components/ui/PageScaffold";
import type { Recipe, RecipeCatalogSource, UserProfile } from "@/types/domain";

const tabs: { key: RecipeCatalogSource; label: string }[] = [
  { key: "all", label: "Bibliotheque" },
  { key: "mine", label: "Mes recettes" },
  { key: "mealizy", label: "Recettes Mealizy" },
  { key: "api", label: "Decouvrir" }
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
  const id = recipe.importedRecipeId || recipe.mealizyRecipeId || recipe._id || recipeId(recipe);
  return `/recipes/${encodeURIComponent(id)}?source=${encodeURIComponent(recipeSource(recipe))}`;
}

function RecipeCard({
  recipe,
  token,
  importingId,
  onImport,
  onPlan
}: {
  recipe: Recipe;
  token: string;
  importingId: string;
  onImport: (recipe: Recipe) => void;
  onPlan: (recipe: Recipe) => void;
}) {
  const spoonacularId = recipe.sourceProvider === "spoonacular" || recipe.source === "api" ? recipe.externalId || recipe.id : "";
  const isImported = Boolean(recipe.isImported || recipe.importedRecipeId || recipe._id);
  const canImport = Boolean(token && spoonacularId && !isImported);

  return (
    <article className="recipe-card">
      {recipe.image ? <img src={recipe.image} alt="" /> : <div className="recipe-image-placeholder">Mealizy</div>}
      <div>
        <div className={isImported ? "recipe-status imported" : "recipe-status external"}>
          {isImported ? <CheckCircle2 size={15} /> : <Download size={15} />}
          <span>{isImported ? "Dans Mealizy" : "Source Spoonacular"}</span>
        </div>
        <Link href={detailHref(recipe)}><strong>{recipe.title}</strong></Link>
        <span>{recipe.preparationTime || recipe.readyInMinutes || 0} min - {recipe.nutrition?.calories || 0} kcal - {recipe.servings || 1} portions</span>
        <div className="recipe-card-actions">
          <button className="outline-action" type="button" disabled={!canImport || importingId === spoonacularId} onClick={() => onImport(recipe)}>
            {importingId === spoonacularId ? <Loader2 size={17} /> : <Download size={17} />} Importer
          </button>
          <button className="outline-action" type="button" disabled={!token || !recipeId(recipe)} onClick={() => onPlan(recipe)}>
            <CalendarPlus size={17} /> Planifier
          </button>
        </div>
      </div>
    </article>
  );
}

export default function RecipesPage() {
  const router = useRouter();
  const [source, setSource] = useState<RecipeCatalogSource>("all");
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
  const [importingId, setImportingId] = useState("");
  const [notice, setNotice] = useState("");
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

  async function handleImport(recipe: Recipe) {
    const externalId = recipe.externalId || recipe.id;
    if (!token || !externalId) return;

    setNotice("");
    setImportingId(String(externalId));
    try {
      const imported = await importSpoonacularRecipe(token, String(externalId));
      setRecipes((currentRecipes) =>
        currentRecipes.map((item) =>
          String(item.externalId || item.id) === String(externalId)
            ? { ...item, isImported: true, importedRecipeId: imported._id, mealizyRecipeId: imported._id, _id: imported._id }
            : item
        )
      );
      setNotice("Recette importee dans Mealizy.");
      router.push(`/recipes/${encodeURIComponent(imported._id || imported.externalId || String(externalId))}?source=api`);
    } catch {
      setNotice("Impossible d'importer cette recette pour le moment.");
    } finally {
      setImportingId("");
    }
  }

  return (
    <PageScaffold title="Bibliotheque des recettes" description="Recherchez, importez et consultez vos recettes depuis Mealizy.">
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
      {notice && <div className="state-panel notice-info">{notice}</div>}
      {status === "ready" && fallbackReason && <div className="state-panel">{fallbackLabel(fallbackReason)}</div>}

      {status === "ready" && (
        <>
          <section className="recipe-catalog">
            {recipes.map((recipe) => (
              <RecipeCard
                key={`${recipe.source}-${recipeId(recipe)}-${recipe.title}`}
                recipe={recipe}
                token={token}
                importingId={importingId}
                onImport={handleImport}
                onPlan={setSelectedRecipe}
              />
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
