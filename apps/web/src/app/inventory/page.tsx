"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Loader2, Plus } from "lucide-react";
import { InventoryPreview } from "@/components/dashboard/InventoryPreview";
import { PageScaffold } from "@/components/ui/PageScaffold";
import { asArray, getInventory, readAuthToken } from "@/lib/api";
import type { InventoryItem } from "@/types/domain";

type Status = "loading" | "ready" | "missing-token" | "error";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = readAuthToken();
    if (!token) {
      setStatus("missing-token");
      return;
    }

    getInventory(token)
      .then((inventory) => {
        setItems(asArray<InventoryItem>(inventory));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <PageScaffold
      title="Inventaire"
      description="Suivez les quantités disponibles, les catégories et les dates de péremption."
      action={<button className="primary-action"><Plus size={18} /> Ajouter un produit</button>}
    >
      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement de l'inventaire</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour voir votre inventaire.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de charger l'inventaire.</div>}
      {status === "ready" && items.length === 0 && <div className="state-panel">Aucun produit dans votre inventaire.</div>}
      {status === "ready" && items.length > 0 && <InventoryPreview items={items} />}
    </PageScaffold>
  );
}
