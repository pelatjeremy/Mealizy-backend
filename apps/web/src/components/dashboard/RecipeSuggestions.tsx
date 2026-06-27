import { Info, ShieldCheck, Sparkles } from "lucide-react";
import { Recipe } from "@/types/domain";

function group(recipes: Recipe[], missingCount: number) {
  return recipes.filter((recipe) => (recipe.missingCount || 0) === missingCount).slice(0, 3);
}

export function RecipeSuggestions({ recipes }: { recipes: Recipe[] }) {
  const sections = [
    { title: "Vous avez tous les ingredients", tone: "ready", items: group(recipes, 0), icon: ShieldCheck },
    { title: "Il manque 1 ingredient", tone: "warn", items: group(recipes, 1), icon: Sparkles },
    { title: "Il manque 2 ingredients", tone: "warn", items: group(recipes, 2), icon: Sparkles },
    { title: "Il manque 3 ingredients", tone: "danger", items: group(recipes, 3), icon: Sparkles }
  ];

  return (
    <section className="panel suggestions">
      <div className="panel-header compact">
        <div>
          <h2>Suggestions de recettes</h2>
          <p>Basees sur votre inventaire</p>
        </div>
        <Info size={20} />
      </div>
      {sections.map((section) => (
        <div className="suggestion-group" key={section.title}>
          <h3 className={section.tone}>
            <section.icon size={16} />
            {section.title} ({section.items.length})
          </h3>
          <div className="recipe-row">
            {section.items.map((recipe) => (
              <article className="recipe-mini" key={recipe.externalId || recipe._id || recipe.title}>
                {recipe.image && <img src={recipe.image} alt="" />}
                <strong>{recipe.title}</strong>
              </article>
            ))}
          </div>
        </div>
      ))}
      <a className="outline-action" href="/recipes">Voir plus de suggestions</a>
    </section>
  );
}
