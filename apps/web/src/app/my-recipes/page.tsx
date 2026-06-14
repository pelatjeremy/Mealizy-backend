import { Plus } from "lucide-react";
import { PageScaffold } from "@/components/ui/PageScaffold";

export default function MyRecipesPage() {
  return (
    <PageScaffold
      title="Mes recettes"
      description="Préparez la future création de recettes personnalisées stockées en base."
      action={<button className="primary-action"><Plus size={18} /> Nouvelle recette</button>}
    >
      <section className="panel empty-state">
        <h2>Recettes personnalisées</h2>
        <p>Le modèle backend est prêt pour les recettes utilisateur. Le formulaire complet pourra être branché sur `POST /api/recipes`.</p>
      </section>
    </PageScaffold>
  );
}
