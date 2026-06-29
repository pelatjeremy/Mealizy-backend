"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, CircleAlert, Loader2, Pencil, Plus } from "lucide-react";
import { asArray, getProfile, getRecipeCatalog, readAuthToken } from "@/lib/api";
import { RecipeFormModal } from "@/components/recipes/RecipeFormModal";
import { recipeId, RecipePlanningModal } from "@/components/recipes/RecipePlanningModal";
import { PageScaffold } from "@/components/ui/PageScaffold";
import type { Recipe, UserProfile } from "@/types/domain";
import { recipeCategoryOptions } from "@/lib/recipe-filters";

export default function MyRecipesPage() {
  const [token, setToken] = useState("");
  const [category, setCategory] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [notice, setNotice] = useState("");

  const loadRecipes = useCallback(async (authToken: string, nextCategory: string) => {
    setStatus("loading");
    try {
      const result = await getRecipeCatalog(authToken, { source: "mine", category: nextCategory, page: 1, limit: 48 });
      setRecipes(asArray<Recipe>(result.items));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    if (!authToken) {
      setStatus("missing-token");
      return;
    }
    getProfile(authToken).then(setProfile).catch(() => setProfile(null));
    loadRecipes(authToken, "");
  }, [loadRecipes]);

  useEffect(() => {
    if (!token) return;
    loadRecipes(token, category);
  }, [category, loadRecipes, token]);

  function handleCreated(recipe: Recipe) {
    setRecipes((items) => [recipe, ...asArray<Recipe>(items)]);
    setNotice("Recette creee avec succes.");
    setIsCreating(false);
  }

  function handleUpdated(recipe: Recipe) {
    const updatedRecipeId = recipeId(recipe);
    setRecipes((items) => asArray<Recipe>(items).map((item) => (recipeId(item) === updatedRecipeId ? recipe : item)));
    setNotice("Recette modifiee avec succes.");
    setEditingRecipe(null);
  }

  return (
    <PageScaffold
      title="Mes recettes"
      description="Creez vos recettes et utilisez-les dans le planning et la liste de courses."
      action={<button className="primary-action" type="button" disabled={!token} onClick={() => setIsCreating(true)}><Plus size={18} /> Creer une recette</button>}
    >
      {notice && <div className="state-panel success-state">{notice}</div>}
      <section className="recipe-filters" aria-label="Filtres de mes recettes">
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrer mes recettes par categorie">
          <option value="">Toutes categories</option>
          {recipeCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </section>
      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement de vos recettes</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour creer une recette.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de charger vos recettes.</div>}
      {status === "ready" && recipes.length === 0 && <div className="state-panel">Vous n'avez pas encore de recette personnelle.</div>}

      {status === "ready" && recipes.length > 0 && (
        <section className="recipe-catalog">
          {asArray<Recipe>(recipes).map((recipe) => (
            <article className="recipe-card" key={recipe._id || recipe.id || recipe.title}>
              {recipe.image ? <img src={recipe.image} alt="" /> : <div className="recipe-image-placeholder">Mealizy</div>}
              <div>
                <Link href={`/recipes/${encodeURIComponent(recipeId(recipe))}?source=user`}><strong>{recipe.title}</strong></Link>
                <span>{recipe.preparationTime} min · {asArray(recipe.ingredients).length} ingredients · {recipe.servings} portions</span>
                <div className="recipe-card-actions">
                  <button className="outline-action" type="button" onClick={() => setEditingRecipe(recipe)}>
                    <Pencil size={17} /> Modifier
                  </button>
                  <button className="outline-action" type="button" onClick={() => setSelectedRecipe(recipe)}>
                    <CalendarPlus size={17} /> Ajouter au planning
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {isCreating && token && <RecipeFormModal token={token} onClose={() => setIsCreating(false)} onSaved={handleCreated} />}
      {editingRecipe && token && <RecipeFormModal token={token} recipe={editingRecipe} onClose={() => setEditingRecipe(null)} onSaved={handleUpdated} />}
      {selectedRecipe && token && <RecipePlanningModal recipe={selectedRecipe} profile={profile} token={token} onClose={() => setSelectedRecipe(null)} />}
    </PageScaffold>
  );
}
