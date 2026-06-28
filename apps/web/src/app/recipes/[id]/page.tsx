"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarPlus, CircleAlert, Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getApiErrorMessage, getProfile, getRecipe, getRecipeCompatibility, readAuthToken } from "@/lib/api";
import { recipeId, RecipePlanningModal } from "@/components/recipes/RecipePlanningModal";
import { PageScaffold } from "@/components/ui/PageScaffold";
import type { Recipe, RecipeCompatibility, RecipeCompatibilityIngredient, UserProfile } from "@/types/domain";

type Status = "loading" | "ready" | "error";

function parseSource(value: string | null): Recipe["source"] | undefined {
  return value === "api" || value === "user" || value === "demo" ? value : undefined;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function stripHtml(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueLabels(values?: string[]) {
  return [...new Set((values || []).map((value) => value.trim()).filter(Boolean))];
}

function formatCompatibilityQuantity(value?: number, unit?: string) {
  if (value === undefined || value === null) return "";
  return `${formatQuantity(Number(value || 0))} ${unit || ""}`.trim();
}

function CompatibilityList({ items, emptyText, partial }: { items: RecipeCompatibilityIngredient[]; emptyText: string; partial?: boolean }) {
  if (!items.length) return <p>{emptyText}</p>;

  return (
    <ul className="recipe-detail-list">
      {items.map((item) => (
        <li key={`${item.status}-${item.normalizedName}-${item.requiredUnit}`}>
          <span>{item.ingredientName}</span>
          <strong>
            {partial && item.quantityComparable
              ? `il manque ${formatCompatibilityQuantity(item.missingQuantity, item.requiredUnit)}`
              : item.quantityComparable === false
                ? "quantite non comparable"
                : formatCompatibilityQuantity(item.requiredQuantity, item.requiredUnit)}
          </strong>
        </li>
      ))}
    </ul>
  );
}

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [compatibility, setCompatibility] = useState<RecipeCompatibility | null>(null);
  const [compatibilityError, setCompatibilityError] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const source = useMemo(() => parseSource(searchParams.get("source")), [searchParams]);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const labels = useMemo(
    () => uniqueLabels([...(recipe?.categories || []), ...(recipe?.diets || []), ...(recipe?.cuisines || []), ...(recipe?.tags || [])]),
    [recipe]
  );

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    setStatus("loading");
    setError("");
    setCompatibility(null);
    setCompatibilityError("");

    Promise.all([
      getRecipe(id, source, authToken),
      authToken ? getProfile(authToken).catch(() => null) : Promise.resolve(null),
      authToken ? getRecipeCompatibility(authToken, id, source).catch((caughtError) => {
        setCompatibilityError(getApiErrorMessage(caughtError, "Compatibilite indisponible."));
        return null;
      }) : Promise.resolve(null)
    ])
      .then(([loadedRecipe, loadedProfile, loadedCompatibility]) => {
        setRecipe(loadedRecipe);
        setProfile(loadedProfile);
        setCompatibility(loadedCompatibility);
        setStatus("ready");
      })
      .catch((caughtError) => {
        setError(getApiErrorMessage(caughtError, "Impossible de charger cette recette."));
        setStatus("error");
      });
  }, [id, source]);

  const canPlan = Boolean(token && recipe && recipeId(recipe));
  const summary = stripHtml(recipe?.summary || recipe?.description || "");

  return (
    <PageScaffold title="Fiche recette" description="Ingredients, etapes, nutrition et informations utiles.">
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
                <span>{recipe.preparationTime || recipe.readyInMinutes || 0} min prep</span>
                <span>{recipe.cookingTime || 0} min cuisson</span>
                <span>{recipe.nutrition?.calories || 0} kcal</span>
              </div>
              {summary && <p className="recipe-summary">{summary}</p>}
              {labels.length > 0 && (
                <div className="chips">
                  {labels.slice(0, 10).map((label) => <span className="chip" key={label}>{label}</span>)}
                </div>
              )}
            </div>
          </header>

          <section className="recipe-detail-grid">
            <div className="panel recipe-detail-section">
              <h3>Ingredients</h3>
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
                <p>Ingredients non renseignes.</p>
              )}
            </div>

            <div className="panel recipe-detail-section compatibility-panel">
              <h3>Compatibilite inventaire</h3>
              {!token && <p>Connectez-vous pour comparer cette recette a votre inventaire.</p>}
              {token && compatibilityError && <p>{compatibilityError}</p>}
              {token && !compatibility && !compatibilityError && <p>Comparaison en cours...</p>}
              {compatibility && (
                <>
                  <div className="compatibility-score">
                    <strong>{compatibility.compatibilityScore}%</strong>
                    <span>{compatibility.availableIngredients} disponibles, {compatibility.partialIngredients} partiels, {compatibility.missingIngredients} manquants</span>
                  </div>
                  <h4>Disponibles</h4>
                  <CompatibilityList items={compatibility.matched} emptyText="Aucun ingredient completement disponible." />
                  <h4>Partiels</h4>
                  <CompatibilityList items={compatibility.partial} emptyText="Aucun ingredient partiellement disponible." partial />
                  <h4>Manquants</h4>
                  <CompatibilityList items={compatibility.missing} emptyText="Aucun ingredient manquant." />
                </>
              )}
            </div>

            <div className="panel recipe-detail-section">
              <h3>Nutrition</h3>
              <dl className="nutrition-list">
                <div><dt>Calories</dt><dd>{recipe.nutrition?.calories || 0} kcal</dd></div>
                <div><dt>Proteines</dt><dd>{recipe.nutrition?.protein || 0} g</dd></div>
                <div><dt>Glucides</dt><dd>{recipe.nutrition?.carbs || 0} g</dd></div>
                <div><dt>Lipides</dt><dd>{recipe.nutrition?.fat || 0} g</dd></div>
                <div><dt>Fibres</dt><dd>{recipe.nutrition?.fiber || 0} g</dd></div>
                <div><dt>Sucres</dt><dd>{recipe.nutrition?.sugar || 0} g</dd></div>
                <div><dt>Sodium</dt><dd>{recipe.nutrition?.sodium || 0} mg</dd></div>
              </dl>
            </div>
          </section>

          <section className="panel recipe-detail-section">
            <h3>Preparation</h3>
            {recipe.instructions?.length ? (
              <ol className="recipe-steps">
                {recipe.instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}
              </ol>
            ) : (
              <p>Etapes de preparation non renseignees.</p>
            )}
          </section>

          <section className="recipe-detail-grid">
            <div className="panel recipe-detail-section">
              <h3>Materiel</h3>
              {recipe.requiredEquipments?.length ? (
                <ul className="recipe-detail-list">
                  {recipe.requiredEquipments.map((equipment) => <li key={equipment}><span>{equipment}</span></li>)}
                </ul>
              ) : (
                <p>Aucun materiel specifique renseigne.</p>
              )}
            </div>

            <div className="panel recipe-detail-section">
              <h3>Informations</h3>
              <dl className="nutrition-list">
                <div><dt>Source</dt><dd>{recipe.sourceProvider || recipe.source || "Mealizy"}</dd></div>
                <div><dt>Cuisines</dt><dd>{recipe.cuisines?.join(", ") || "Non renseigne"}</dd></div>
                <div><dt>Regimes</dt><dd>{recipe.diets?.join(", ") || "Non renseigne"}</dd></div>
                <div><dt>Categories</dt><dd>{recipe.categories?.join(", ") || "Non renseigne"}</dd></div>
              </dl>
            </div>
          </section>
        </article>
      )}

      {isPlanning && recipe && token && (
        <RecipePlanningModal recipe={recipe} profile={profile} token={token} onClose={() => setIsPlanning(false)} />
      )}
    </PageScaffold>
  );
}
