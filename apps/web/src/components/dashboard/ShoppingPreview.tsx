import { asArray } from "@/lib/api";
import { ShoppingItem } from "@/types/domain";

export function ShoppingPreview({ items }: { items: ShoppingItem[] }) {
  const safeItems = asArray<ShoppingItem>(items);
  return (
    <section className="panel shopping-preview">
      <div className="panel-header compact">
        <h2>Liste de courses</h2>
        <span>{safeItems.length} produit{safeItems.length > 1 ? "s" : ""}</span>
      </div>
      <ul className="shopping-list">
        {safeItems.map((item) => (
          <li key={item.id}>
            <span className="checkbox" />
            <strong>{item.ingredientName}</strong>
            <small>{item.quantity} {item.unit}</small>
          </li>
        ))}
      </ul>
      <a className="outline-action" href="/shopping-list">Voir la liste complète</a>
    </section>
  );
}
