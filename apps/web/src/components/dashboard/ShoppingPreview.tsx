import { ShoppingItem } from "@/types/domain";

export function ShoppingPreview({ items }: { items: ShoppingItem[] }) {
  return (
    <section className="panel shopping-preview">
      <div className="panel-header compact">
        <h2>Liste de courses</h2>
        <span>{items.length} produit{items.length > 1 ? "s" : ""}</span>
      </div>
      <ul className="shopping-list">
        {items.map((item) => (
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
