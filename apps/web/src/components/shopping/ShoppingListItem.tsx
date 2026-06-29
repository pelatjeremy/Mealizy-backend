"use client";

import type { ShoppingItem } from "@/types/domain";

const unitLabels: Record<string, string> = {
  unit: "unite",
  slice: "tranche",
  can: "boite",
  jar: "pot",
  tbsp: "c. a soupe",
  tsp: "c. a cafe"
};

const categoryLabels: Record<string, string> = {
  "fruits-legumes": "Fruits et legumes",
  legumes: "Legumes",
  fruits: "Fruits",
  "produits-laitiers": "Produits laitiers",
  "viandes-poissons": "Viandes et poissons",
  feculents: "Feculents",
  epicerie: "Epicerie",
  autres: "Autres"
};

export function ShoppingListItem({
  item,
  disabled,
  onToggle
}: {
  item: ShoppingItem;
  disabled?: boolean;
  onToggle: (item: ShoppingItem, checked: boolean) => void;
}) {
  return (
    <li className={item.checked ? "shopping-list-row checked" : "shopping-list-row"}>
      <label className="shopping-check">
        <input
          aria-label={`${item.checked ? "Remettre" : "Marquer"} ${item.ingredientName}`}
          type="checkbox"
          checked={item.checked}
          disabled={disabled}
          onChange={(event) => onToggle(item, event.target.checked)}
        />
        <span aria-hidden="true" />
      </label>
      <div className="shopping-item-main">
        <strong>{item.ingredientName}</strong>
        <small>{categoryLabels[item.category] || item.category || "Autres"}</small>
      </div>
      <span className="shopping-quantity">
        {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(item.quantity)} {unitLabels[item.unit] || item.unit}
      </span>
    </li>
  );
}
