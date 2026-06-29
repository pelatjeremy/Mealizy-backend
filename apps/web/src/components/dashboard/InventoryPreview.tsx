import { Apple, Egg, Milk, Package2 } from "lucide-react";
import { InventoryItem } from "@/types/domain";

const icons = [Apple, Egg, Package2, Package2, Milk];

export function InventoryPreview({ items }: { items: InventoryItem[] }) {
  return (
    <section className="panel">
      <div className="panel-header compact">
        <h2>Inventaire</h2>
        <a href="/inventory">Voir tout</a>
      </div>
      <div className="chips">
        {["Tout", "Fruits & Légumes", "Épicerie", "Produits laitiers", "Viandes & Poissons", "Autres"].map((chip, index) => (
          <span className={index === 0 ? "chip active" : "chip"} key={chip}>{chip}</span>
        ))}
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Produit</th><th>Quantité</th><th>Catégorie</th><th>Date de péremption</th></tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const Icon = icons[index] || Package2;
            const itemName = item.name || item.ingredientId?.name || "Produit";
            const category = item.category || item.ingredientId?.category || "Autres";
            const expirationDate = item.expirationDate ? new Date(item.expirationDate).toLocaleDateString("fr-FR") : "-";
            return (
              <tr key={item.id || item._id || itemName}>
                <td><Icon size={20} /> {itemName}</td>
                <td>{item.quantity} {item.unit}</td>
                <td>{category}</td>
                <td>{expirationDate}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
