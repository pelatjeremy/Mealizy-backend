import { ShoppingListManager } from "@/components/shopping/ShoppingListManager";
import { PageScaffold } from "@/components/ui/PageScaffold";

export default function ShoppingListPage() {
  return (
    <PageScaffold
      title="Liste de courses"
      description="Générez, cochez et rangez les achats calculés depuis votre planning de repas."
    >
      <ShoppingListManager />
    </PageScaffold>
  );
}
