import { Bell, Flame, PackageOpen, ShoppingCart, Utensils } from "lucide-react";
import { MealPlanner } from "@/components/dashboard/MealPlanner";
import { NutritionPanel } from "@/components/dashboard/NutritionPanel";
import { RecipeSuggestions } from "@/components/dashboard/RecipeSuggestions";
import { ShoppingPreview } from "@/components/dashboard/ShoppingPreview";
import { StatCard } from "@/components/dashboard/StatCard";
import { InventoryPreview } from "@/components/dashboard/InventoryPreview";
import { getDashboardData } from "@/lib/api";

export default async function DashboardPage() {
  const { inventory, shoppingList, recipes } = await getDashboardData();

  return (
    <div className="dashboard-layout">
      <main className="main-column">
        <header className="page-header">
          <div>
            <h1>Tableau de bord 👋</h1>
            <p>Voici un aperçu de votre semaine et de votre inventaire.</p>
          </div>
          <button className="icon-button" aria-label="Notifications">
            <Bell size={21} />
            <span className="badge">2</span>
          </button>
        </header>

        <section className="stats-grid" aria-label="Indicateurs">
          <StatCard icon={PackageOpen} tone="green" label="Inventaire" value={inventory.length.toString()} helper="produits disponibles" href="/inventory" cta="Voir l'inventaire" />
          <StatCard icon={Utensils} tone="orange" label="Repas planifiés" value="15" helper="repas cette semaine" href="/meal-plans" cta="Voir le planning" />
          <StatCard icon={ShoppingCart} tone="purple" label="Liste de courses" value={shoppingList.length.toString()} helper="produits à acheter" href="/shopping-list" cta="Voir la liste" />
          <StatCard icon={Flame} tone="blue" label="Calories moyenne" value="1 850" helper="kcal / jour" href="/profile" cta="Voir le détail" />
        </section>

        <MealPlanner />

        <section className="split-grid">
          <InventoryPreview items={inventory} />
          <ShoppingPreview items={shoppingList} />
        </section>
      </main>

      <aside className="right-rail">
        <RecipeSuggestions recipes={recipes} />
        <NutritionPanel />
      </aside>
    </div>
  );
}
