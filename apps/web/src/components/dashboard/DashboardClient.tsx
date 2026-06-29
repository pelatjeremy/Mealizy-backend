"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CircleAlert, Flame, Loader2, PackageOpen, ShoppingCart, Utensils } from "lucide-react";
import { InventoryPreview } from "@/components/dashboard/InventoryPreview";
import { MealPlanner } from "@/components/dashboard/MealPlanner";
import { NutritionPanel } from "@/components/dashboard/NutritionPanel";
import { RecipeSuggestions } from "@/components/dashboard/RecipeSuggestions";
import { ShoppingPreview } from "@/components/dashboard/ShoppingPreview";
import { StatCard } from "@/components/dashboard/StatCard";
import { getInventory, getMealPlans, getRecipeSuggestions, getShoppingList, readAuthToken } from "@/lib/api";
import type { InventoryItem, MealPlan, Recipe, ShoppingItem } from "@/types/domain";
import { formatWeekParam, getWeekStart } from "@/components/shopping/WeekSelector";

type Status = "loading" | "ready" | "missing-token" | "error";

function toShoppingItems(items: ShoppingItem[] | undefined) {
  return Array.isArray(items) ? items : [];
}

export function DashboardClient() {
  const [status, setStatus] = useState<Status>("loading");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const week = useMemo(() => formatWeekParam(getWeekStart()), []);
  const remainingShoppingItems = useMemo(
    () => (Array.isArray(shoppingItems) ? shoppingItems : []).filter((item) => !item.checked),
    [shoppingItems]
  );

  useEffect(() => {
    const token = readAuthToken();
    if (!token) {
      setStatus("missing-token");
      return;
    }

    function loadDashboard() {
      Promise.all([
        getInventory(token),
        getMealPlans(token, week),
        getShoppingList(token, week),
        getRecipeSuggestions(token, { limit: 5 })
      ])
        .then(([inventoryItems, plans, shoppingList, suggestions]) => {
          setInventory(Array.isArray(inventoryItems) ? inventoryItems : []);
          setMealPlans(Array.isArray(plans) ? plans : []);
          setShoppingItems(toShoppingItems(shoppingList.items));
          setRecipes(
            (Array.isArray(suggestions.suggestions) ? suggestions.suggestions : []).map((suggestion) => ({
              ...suggestion.recipe,
              score: suggestion.score,
              missingCount: suggestion.missingCount
            }))
          );
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    }

    loadDashboard();
    window.addEventListener("mealizy:data-changed", loadDashboard);
    return () => window.removeEventListener("mealizy:data-changed", loadDashboard);
  }, [week]);

  return (
    <div className="dashboard-layout">
      <main className="main-column">
        <header className="page-header">
          <div>
            <h1>Tableau de bord</h1>
            <p>Voici un aperçu de votre semaine et de votre inventaire.</p>
          </div>
          <button className="icon-button" aria-label="Notifications">
            <Bell size={21} />
            <span className="badge">0</span>
          </button>
        </header>

        {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement du tableau de bord</div>}
        {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour voir votre tableau de bord.</div>}
        {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de charger le tableau de bord.</div>}

        {status === "ready" && (
          <>
            <section className="stats-grid" aria-label="Indicateurs">
              <StatCard icon={PackageOpen} tone="green" label="Inventaire" value={inventory.length.toString()} helper="produits disponibles" href="/inventory" cta="Voir l'inventaire" />
              <StatCard icon={Utensils} tone="orange" label="Repas planifiés" value={mealPlans.length.toString()} helper="repas cette semaine" href="/meal-plans" cta="Voir le planning" />
              <StatCard icon={ShoppingCart} tone="purple" label="Liste de courses" value={remainingShoppingItems.length.toString()} helper="produits à acheter" href="/shopping-list" cta="Voir la liste" />
              <StatCard icon={Flame} tone="blue" label="Calories moyenne" value="0" helper="kcal / jour" href="/profile" cta="Voir le détail" />
            </section>

            <MealPlanner />

            <section className="split-grid">
              <InventoryPreview items={inventory} />
              <ShoppingPreview items={remainingShoppingItems} />
            </section>
          </>
        )}
      </main>

      <aside className="right-rail">
        <RecipeSuggestions recipes={recipes} />
        <NutritionPanel />
      </aside>
    </div>
  );
}
