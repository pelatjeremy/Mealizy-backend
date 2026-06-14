import { CheckCircle2 } from "lucide-react";
import { ShoppingPreview } from "@/components/dashboard/ShoppingPreview";
import { PageScaffold } from "@/components/ui/PageScaffold";
import { shoppingList } from "@/lib/demo-data";

export default function ShoppingListPage() {
  return (
    <PageScaffold
      title="Liste de courses"
      description="La liste est calculée depuis les repas planifiés moins votre inventaire."
      action={<button className="primary-action"><CheckCircle2 size={18} /> Ajouter les achats cochés</button>}
    >
      <ShoppingPreview items={shoppingList} />
    </PageScaffold>
  );
}
