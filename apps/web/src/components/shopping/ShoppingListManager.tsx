"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, RefreshCw } from "lucide-react";
import {
  completeShoppingList,
  asArray,
  generateShoppingList,
  getApiErrorMessage,
  getShoppingList,
  readAuthToken,
  updateShoppingListItemChecked
} from "@/lib/api";
import type { ShoppingItem, ShoppingList } from "@/types/domain";
import { formatWeekParam, getWeekStart, WeekSelector } from "./WeekSelector";
import { ShoppingListItem } from "./ShoppingListItem";

type Status = "loading" | "ready" | "missing-token" | "error";
type Notice = { text: string; tone: "success" | "info" | "error" };

function splitItems(items: ShoppingItem[]) {
  const safeItems = asArray<ShoppingItem>(items);
  return {
    toBuy: safeItems.filter((item) => !item.checked),
    bought: safeItems.filter((item) => item.checked)
  };
}

export function ShoppingListManager() {
  const [token, setToken] = useState("");
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const week = formatWeekParam(weekStart);
  const items = asArray<ShoppingItem>(shoppingList?.items);
  const { toBuy, bought } = useMemo(() => splitItems(items), [items]);

  const loadList = useCallback(async (authToken: string) => {
    setStatus("loading");
    setNotice(null);
    try {
      setShoppingList(await getShoppingList(authToken, week));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [week]);

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    if (!authToken) {
      setStatus("missing-token");
      return;
    }
    loadList(authToken);
  }, [loadList]);

  async function handleGenerate() {
    if (!token) return;
    setIsGenerating(true);
    setNotice(null);
    try {
      const list = await generateShoppingList(token, week);
      setShoppingList(list);
      setStatus("ready");
      setNotice(
        list.items.length
          ? { text: `Liste generee : ${list.items.length} article${list.items.length > 1 ? "s" : ""} a traiter.`, tone: "success" }
          : { text: "Aucune course necessaire : votre inventaire couvre les recettes planifiees.", tone: "info" }
      );
      window.dispatchEvent(new Event("mealizy:data-changed"));
    } catch (error) {
      setStatus("ready");
      setNotice({ text: getApiErrorMessage(error, "Impossible de generer la liste de courses."), tone: "error" });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleToggle(item: ShoppingItem, checked: boolean) {
    if (!token || !item.id) return;
    setBusyItemId(item.id);
    setShoppingList((current) => current ? {
      ...current,
        items: asArray<ShoppingItem>(current.items).map((entry) => (entry.id === item.id ? { ...entry, checked } : entry))
    } : current);

    try {
      setShoppingList(await updateShoppingListItemChecked(token, item.id, checked));
      setNotice({
        text: checked ? "Article ajoute a l'inventaire." : "Article retire de l'inventaire.",
        tone: "success"
      });
      window.dispatchEvent(new Event("mealizy:data-changed"));
    } catch (error) {
      setShoppingList((current) => current ? {
        ...current,
        items: asArray<ShoppingItem>(current.items).map((entry) => (entry.id === item.id ? { ...entry, checked: item.checked } : entry))
      } : current);
      setNotice({ text: getApiErrorMessage(error, `Impossible de synchroniser ${item.ingredientName} avec l'inventaire.`), tone: "error" });
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleCompletePurchases() {
    if (!token || bought.length === 0) return;
    setIsCompleting(true);
    setNotice(null);
    try {
      setShoppingList(await completeShoppingList(token, week));
      setNotice({ text: "Achats valides. Les articles achetes ont ete retires de la liste.", tone: "success" });
      window.dispatchEvent(new Event("mealizy:data-changed"));
    } catch (error) {
      setNotice({ text: getApiErrorMessage(error, "Impossible de valider les achats."), tone: "error" });
    } finally {
      setIsCompleting(false);
    }
  }

  function renderItems(sectionItems: ShoppingItem[], emptyText: string) {
    if (!sectionItems.length) return <div className="shopping-empty">{emptyText}</div>;
    return (
      <ul className="shopping-list detailed">
        {sectionItems.map((item) => (
          <ShoppingListItem
            key={item.id}
            item={item}
            disabled={busyItemId === item.id}
            onToggle={handleToggle}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="shopping-manager">
      <div className="panel shopping-toolbar">
        <div>
          <h2>Semaine de courses</h2>
          <p>{shoppingList?._id ? `${toBuy.length} a acheter, ${bought.length} deja achete${bought.length > 1 ? "s" : ""}.` : "Aucune liste generee pour cette semaine."}</p>
        </div>
        <WeekSelector weekStart={weekStart} onChange={setWeekStart} />
        <button type="button" className="primary-action" disabled={isGenerating || status === "missing-token"} onClick={handleGenerate}>
          {isGenerating ? <Loader2 size={17} /> : <RefreshCw size={17} />}
          {shoppingList?._id ? "Regenerer la liste" : "Generer la liste"}
        </button>
        {bought.length > 0 && (
          <button type="button" className="outline-action" disabled={isCompleting} onClick={handleCompletePurchases}>
            {isCompleting ? <Loader2 size={17} /> : <CheckCircle2 size={17} />}
            Valider les achats
          </button>
        )}
      </div>

      {notice && <div className={`state-panel notice-${notice.tone}`} role="status" aria-live="polite">{notice.text}</div>}
      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement de la liste...</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour gerer votre liste de courses.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de recuperer la liste de courses.</div>}

      {status === "ready" && (
        <div className="shopping-sections">
          {!shoppingList?._id && (
            <div className="state-panel shopping-callout">
              Aucune liste generee pour cette semaine.
              <button type="button" className="primary-action" disabled={isGenerating} onClick={handleGenerate}>
                Generer ma liste de courses
              </button>
            </div>
          )}

          {shoppingList?._id && items.length === 0 && <div className="state-panel notice-info">Aucune course necessaire pour cette semaine.</div>}

          {shoppingList?._id && items.length > 0 && (
            <>
              <section className="panel shopping-section shopping-section-buy">
                <div className="panel-header compact"><h2>A acheter</h2><span>{toBuy.length}</span></div>
                {renderItems(toBuy, "Tous les articles sont achetes.")}
              </section>
              <section className="panel shopping-section shopping-section-bought">
                <div className="panel-header compact"><h2>Deja achetes</h2><span>{bought.length}</span></div>
                {renderItems(bought, "Aucun article achete.")}
              </section>
            </>
          )}
        </div>
      )}
    </section>
  );
}
