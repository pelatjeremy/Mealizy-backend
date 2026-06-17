"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarPlus, CircleAlert, Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getApiErrorMessage, getProfile, getRecipe, readAuthToken } from "@/lib/api";
import { recipeId, RecipePlanningModal } from "@/components/recipes/RecipePlanningModal";
import { PageScaffold } from "@/components/ui/PageScaffold";
import type { Recipe, UserProfile } from "@/types/domain";

type Status = "loading" | "ready" | "error";

function parseSource(value: string | null): Recipe["source"] | undefined {
  return value === "api" || value === "user" || value === "demo" ? value : undefined;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const source = useMemo(() => parseSource(searchParams.get("source")), [searchParams]);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    setStatus("loading");
    setError("");

    Promise.all([
      getRecipe(id, source, authToken),
      authToken ? getProfile(authToken).catch(() => null) : Promise.resolve(null)
    ])
      .then(([loadedRecipe, loadedProfile]) => {
        setRecipe(loadedRecipe);
        setProfile(loadedProfile);
        setStatus("ready");
      })
      .catch((caughtError) => {
        setError(getApiErrorMessage(caughtError, "Impossible de charger cette recette."));
        setStatus("error");
      });
  }, [id, source]);

  const canPlan = Boolean(token && recipe && recipeId(recipe));

  return (
    <PageScaffold title="Détail recette" description="Ingrédients, étapes et informations nutritionnelles.">
      <div className="recipe-detail-toolbar">
        <button className="outline-action compact-action" type="button" onClick={() => router.back()}>
          <ArrowLeft size={17} /> Retour
        </button>
        {recipe && (
          <button className="primary-action" type="button" disabled={!canPlan} onClick={() => setIsPlanning(true)}>
            <CalendarPlus size={17} /> Ajouter au planning
          </button>
        )}
      </div>

      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement de la recette</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> {error}</div>}

      {status === "ready" && recipe && (
        <article className="recipe-detail">
          <header className="recipe-detail-hero">
            {recipe.image ? <img src={recipe.image} alt="" /> : <div className="recipe-image-placeholder">Mealizy</div>}
            <div>
              <h2>{recipe.title}</h2>
              <div className="recipe-detail-meta">
                <span>{recipe.servings || 1} portions</span>
                <span>{recipe.preparationTime || 0} min</span>
                <span>{recipe.nutrition?.calories || 0} kcal</span>
              </div>
            </div>
          </header>

          <section className="recipe-detail-grid">
            <div className="panel recipe-detail-section">
              <h3>Ingrédients</h3>
              {recipe.ingredients?.length ? (
                <ul className="recipe-detail-list">
                  {recipe.ingredients.map((ingredient) => (
                    <li key={`${ingredient.normalizedName}-${ingredient.unit}-${ingredient.quantity}`}>
                      <span>{ingredient.ingredientName}</span>
                      <strong>{formatQuantity(Number(ingredient.quantity || 0))} {ingredient.unit}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Ingrédients non renseignés.</p>
              )}
            </div>

            <div className="panel recipe-detail-section">
              <h3>Nutrition</h3>
              <dl className="nutrition-list">
                <div><dt>Calories</dt><dd>{recipe.nutrition?.calories || 0} kcal</dd></div>
                <div><dt>Protéines</dt><dd>{recipe.nutrition?.protein || 0} g</dd></div>
                <div><dt>Glucides</dt><dd>{recipe.nutrition?.carbs || 0} g</dd></div>
                <div><dt>Lipides</dt><dd>{recipe.nutrition?.fat || 0} g</dd></div>
              </dl>
            </div>
          </section>

          <section className="panel recipe-detail-section">
            <h3>Préparation</h3>
            {recipe.instructions?.length ? (
              <ol className="recipe-steps">
                {recipe.instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}
              </ol>
            ) : (
              <p>Étapes de préparation non renseignées.</p>
            )}
          </section>
        </article>
      )}

      {isPlanning && recipe && token && (
        <RecipePlanningModal recipe={recipe} profile={profile} token={token} onClose={() => setIsPlanning(false)} />
      )}
    </PageScaffold>
  );
}
