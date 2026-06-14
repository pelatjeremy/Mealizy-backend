import { MealPlanner } from "@/components/dashboard/MealPlanner";
import { PageScaffold } from "@/components/ui/PageScaffold";

export default function MealPlansPage() {
  return (
    <PageScaffold title="Planning repas" description="Planifiez les repas de la semaine par jour et par type de repas.">
      <MealPlanner />
    </PageScaffold>
  );
}
