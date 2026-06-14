import { Plus } from "lucide-react";
import { InventoryPreview } from "@/components/dashboard/InventoryPreview";
import { PageScaffold } from "@/components/ui/PageScaffold";
import { inventory } from "@/lib/demo-data";

export default function InventoryPage() {
  return (
    <PageScaffold
      title="Inventaire"
      description="Suivez les quantités disponibles, les catégories et les dates de péremption."
      action={<button className="primary-action"><Plus size={18} /> Ajouter un produit</button>}
    >
      <InventoryPreview items={inventory} />
    </PageScaffold>
  );
}
