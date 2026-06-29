"use client";

import { FormEvent, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { createRecipe, getApiErrorMessage, updateRecipe } from "@/lib/api";
import type { Recipe } from "@/types/domain";

type IngredientDraft = {
  id: number;
  ingredientName: string;
  quantity: string;
  unit: string;
  category: string;
};

const units = ["unit", "g", "kg", "ml", "l", "slice", "can", "jar", "tbsp", "tsp"];
const categories = ["legumes", "fruits", "feculents", "produits-laitiers", "viandes-poissons", "epicerie", "autres"];

function emptyIngredient(id: number): IngredientDraft {
  return { id, ingredientName: "", quantity: "", unit: "unit", category: "autres" };
}

function recipeIngredientDrafts(recipe?: Recipe): IngredientDraft[] {
  if (!recipe?.ingredients?.length) return [emptyIngredient(1), emptyIngredient(2)];
  return recipe.ingredients.map((ingredient, index) => ({
    id: index + 1,
    ingredientName: ingredient.ingredientName || "",
    quantity: String(ingredient.quantity || ""),
    unit: ingredient.unit || "unit",
    category: ingredient.category || "autres"
  }));
}

export function RecipeFormModal({
  token,
  recipe,
  onClose,
  onSaved
}: {
  token: string;
  recipe?: Recipe;
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
}) {
  const isEditing = Boolean(recipe);
  const [title, setTitle] = useState(recipe?.title || "");
  const [image, setImage] = useState(recipe?.image || "");
  const [preparationTime, setPreparationTime] = useState(String(recipe?.preparationTime || 20));
  const [servings, setServings] = useState(String(recipe?.servings || 2));
  const [instructions, setInstructions] = useState((recipe?.instructions || []).join("\n"));
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() => recipeIngredientDrafts(recipe));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  function updateIngredient(id: number, field: keyof Omit<IngredientDraft, "id">, value: string) {
    setIngredients((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    try {
      const payload = {
        title,
        image,
        preparationTime: Number(preparationTime),
        servings: Number(servings),
        ingredients: ingredients.map(({ ingredientName, quantity, unit, category }) => ({
          ingredientName,
          quantity: Number(quantity),
          unit,
          category
        })),
        instructions: instructions.split("\n").map((line) => line.trim()).filter(Boolean)
      };
      const savedRecipe = isEditing && (recipe?._id || recipe?.id)
        ? await updateRecipe(token, recipe._id || recipe.id || "", payload)
        : await createRecipe(token, payload);
      onSaved(savedRecipe);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, isEditing ? "Impossible de modifier la recette." : "Impossible de creer la recette."));
      setStatus("error");
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="recipe-form-title">
      <form className="recipe-form-modal" onSubmit={handleSubmit}>
        <header>
          <div>
            <h2 id="recipe-form-title">{isEditing ? "Modifier la recette" : "Creer une recette"}</h2>
            <p>Renseignez les ingredients utilises pour le planning et la liste de courses.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="recipe-form-grid">
          <label>Titre<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Image URL<input type="url" value={image} onChange={(event) => setImage(event.target.value)} placeholder="Optionnel" /></label>
          <label>Temps (minutes)<input required min="1" type="number" value={preparationTime} onChange={(event) => setPreparationTime(event.target.value)} /></label>
          <label>Portions<input required min="1" type="number" value={servings} onChange={(event) => setServings(event.target.value)} /></label>
        </div>

        <section className="recipe-form-section">
          <div className="panel-header compact">
            <h3>Ingredients</h3>
            <button className="outline-action compact-action" type="button" onClick={() => setIngredients((items) => [...items, emptyIngredient(Date.now())])}>
              <Plus size={16} /> Ajouter
            </button>
          </div>
          <div className="ingredient-editor">
            {ingredients.map((ingredient) => (
              <div className="ingredient-editor-row" key={ingredient.id}>
                <input required aria-label="Nom ingredient" value={ingredient.ingredientName} onChange={(event) => updateIngredient(ingredient.id, "ingredientName", event.target.value)} placeholder="Ingredient" />
                <input required aria-label="Quantite" min="0.01" step="0.01" type="number" value={ingredient.quantity} onChange={(event) => updateIngredient(ingredient.id, "quantity", event.target.value)} placeholder="Quantite" />
                <select aria-label="Unite" value={ingredient.unit} onChange={(event) => updateIngredient(ingredient.id, "unit", event.target.value)}>
                  {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                <select aria-label="Categorie" value={ingredient.category} onChange={(event) => updateIngredient(ingredient.id, "category", event.target.value)}>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <button className="icon-button" type="button" aria-label={`Supprimer ${ingredient.ingredientName || "ingredient"}`} disabled={ingredients.length === 1} onClick={() => setIngredients((items) => items.filter((item) => item.id !== ingredient.id))}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <label>Preparation<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Une etape par ligne" /></label>

        {status === "error" && <p className="form-note danger">{error}</p>}
        <footer>
          <button className="outline-action compact-action" type="button" onClick={onClose}>Annuler</button>
          <button className="primary-action" type="submit" disabled={status === "saving"}>
            <Save size={17} /> {status === "saving" ? "Enregistrement..." : isEditing ? "Enregistrer" : "Creer la recette"}
          </button>
        </footer>
      </form>
    </div>
  );
}
