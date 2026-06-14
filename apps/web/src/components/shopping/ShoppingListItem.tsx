"use client";

import { PackagePlus } from "lucide-react";
import type { ShoppingItem } from "@/types/domain";

export function ShoppingListItem({
  item,
  disabled,
  onToggle,
  onAddToInventory
}: {
  item: ShoppingItem;
  disabled?: boolean;
  onToggle: (item: ShoppingItem, checked: boolean) => void;
  onAddToInventory: (item: ShoppingItem) => void;
}) {
  return (
    <li className={item.checked ? "shopping-list-row checked" : "shopping-list-row"}>
      <label className="shopping-check">
        <input type="checkbox" checked={item.checked} disabled={disabled} onChange={(event) => onToggle(item, event.target.checked)} />
        <span aria-hidden="true" />
      </label>
      <div className="shopping-item-main">
        <strong>{item.ingredientName}</strong>
        <small>{item.category || "autres"}</small>
      </div>
      <span className="shopping-quantity">
        {item.quantity} {item.unit}
      </span>
      <button type="button" className="outline-action compact-action" disabled={disabled} onClick={() => onAddToInventory(item)}>
        <PackagePlus size={16} />
        Ajouter à l'inventaire
      </button>
    </li>
  );
}
