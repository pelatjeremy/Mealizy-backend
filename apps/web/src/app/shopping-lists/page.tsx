"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { asArray, deleteShoppingList, getShoppingLists, readAuthToken, updateRecipeShoppingListItemChecked } from "@/lib/api";
import type { ShoppingList, ShoppingItem } from "@/types/domain";
import { PageScaffold } from "@/components/ui/PageScaffold";

type Status = "loading" | "ready" | "missing-token" | "error";

function formatQuantity(item: ShoppingItem) {
  const value = Number(item.quantity || 0);
  const quantity = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return `${quantity} ${item.unit || ""}`.trim();
}

function checked(item: ShoppingItem) {
  return Boolean(item.checked || item.isChecked);
}

export default function ShoppingListsPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<Status>("loading");

  const selectedList = useMemo(
    () => asArray<ShoppingList>(lists).find((list) => list._id === selectedId) || asArray<ShoppingList>(lists)[0] || null,
    [lists, selectedId]
  );

  function loadLists(authToken: string) {
    setStatus("loading");
    getShoppingLists(authToken)
      .then((loadedLists) => {
        const safeLists = asArray<ShoppingList>(loadedLists);
        setLists(safeLists);
        setSelectedId((current) => searchParams.get("id") || current || safeLists[0]?._id || "");
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    if (!authToken) {
      setStatus("missing-token");
      return;
    }
    loadLists(authToken);
  }, []);

  function toggleItem(item: ShoppingItem) {
    if (!token || !selectedList?._id || !item.id) return;
    updateRecipeShoppingListItemChecked(token, selectedList._id, item.id, !checked(item))
      .then((updatedList) => {
        setLists((current) => asArray<ShoppingList>(current).map((list) => (list._id === updatedList._id ? updatedList : list)));
      })
      .catch(() => setStatus("error"));
  }

  function removeList(list: ShoppingList) {
    if (!token || !list._id) return;
    deleteShoppingList(token, list._id)
      .then(() => {
        setLists((current) => asArray<ShoppingList>(current).filter((entry) => entry._id !== list._id));
        setSelectedId("");
      })
      .catch(() => setStatus("error"));
  }

  return (
    <PageScaffold title="Listes de courses" description="Ingredients manquants generes depuis vos recettes suggerees.">
      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement des listes</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour voir vos listes.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de charger les listes.</div>}

      {status === "ready" && (
        <section className="shopping-lists-layout">
          <aside className="shopping-lists-index">
            {asArray<ShoppingList>(lists).map((list) => (
              <button
                className={selectedList?._id === list._id ? "shopping-list-tab active" : "shopping-list-tab"}
                key={list._id}
                type="button"
                onClick={() => setSelectedId(list._id || "")}
              >
                <ShoppingCart size={17} />
                <span>
                  <strong>{list.title || "Liste de courses"}</strong>
                  <small>{asArray<ShoppingItem>(list.items).length} ingredient{asArray<ShoppingItem>(list.items).length > 1 ? "s" : ""}</small>
                </span>
              </button>
            ))}
            {!asArray<ShoppingList>(lists).length && <div className="state-panel">Aucune liste creee pour le moment.</div>}
          </aside>

          {selectedList && (
            <article className="panel shopping-list-detail">
              <header className="panel-header compact">
                <div>
                  <h2>{selectedList.title || "Liste de courses"}</h2>
                  <p>{asArray<NonNullable<ShoppingList["sourceRecipes"]>[number]>(selectedList.sourceRecipes).map((recipe) => recipe.title).filter(Boolean).join(", ") || "Recettes sources"}</p>
                </div>
                <button className="icon-button" type="button" aria-label="Supprimer la liste" onClick={() => removeList(selectedList)}>
                  <Trash2 size={18} />
                </button>
              </header>

              <div className="shopping-list-items">
                {asArray<ShoppingItem>(selectedList.items).map((item) => (
                  <label className={checked(item) ? "shopping-generated-item checked" : "shopping-generated-item"} key={item.id}>
                    <input type="checkbox" checked={checked(item)} onChange={() => toggleItem(item)} />
                    <span>
                      <strong>{item.displayName || item.ingredientName}</strong>
                      <small>{item.category || "autres"} - {asArray<NonNullable<ShoppingItem["sourceRecipes"]>[number]>(item.sourceRecipes).map((recipe) => recipe.title).filter(Boolean).join(", ") || "recette"}</small>
                    </span>
                    <em>{formatQuantity(item)}</em>
                  </label>
                ))}
              </div>
            </article>
          )}
        </section>
      )}
    </PageScaffold>
  );
}
