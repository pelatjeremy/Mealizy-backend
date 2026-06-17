import { inventory, recipes, shoppingList } from "./demo-data";
import type { MealPlan, MealPlanDay, MealType, Recipe, RecipeSuggestionGroups, ShoppingList, UserProfile } from "@/types/domain";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is required");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error("API request failed");
    if (response.status === 204) return undefined as T;
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRecipeSuggestions(token: string) {
  return request<RecipeSuggestionGroups>("/recipes/suggestions", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getRecipe(id: string, source?: Recipe["source"], token?: string) {
  const params = source ? `?source=${encodeURIComponent(source)}` : "";
  return request<Recipe>(`/recipes/${encodeURIComponent(id)}${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

export function readAuthToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("mealizy_token") || "";
}

export function storeAuthToken(token: string) {
  localStorage.setItem("mealizy_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("mealizy_token");
}

export async function login(payload: { email: string; password: string }) {
  return request<{ token: string; user: UserProfile }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function register(payload: { firstname: string; lastname: string; email: string; password: string }) {
  return request<{ token: string; user: UserProfile }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getProfile(token: string) {
  return request<UserProfile>("/users/profile", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getMealPlans(token: string, week: string) {
  return request<MealPlan[]>(`/meal-plans?week=${encodeURIComponent(week)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createMealPlan(
  token: string,
  payload: {
    weekStartDate: string;
    day: MealPlanDay;
    mealType: MealType;
    recipeId: string;
    recipeSource: "api" | "user" | "demo";
    servings?: number;
  }
) {
  return request<MealPlan>("/meal-plans", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateMealPlan(token: string, id: string, payload: { servings?: number; recipeId?: string; recipeSource?: "api" | "user" | "demo" }) {
  return request<MealPlan>(`/meal-plans/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteMealPlan(token: string, id: string) {
  await request<void>(`/meal-plans/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function normalizeShoppingList(list: ShoppingList): ShoppingList {
  return {
    ...list,
    items: (list.items || []).map((item) => ({
      ...item,
      id: item.id || item._id || ""
    }))
  };
}

export async function getShoppingList(token: string, week: string) {
  const list = await request<ShoppingList>(`/shopping-list?week=${encodeURIComponent(week)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeShoppingList(list);
}

export async function generateShoppingList(token: string, week: string) {
  const list = await request<ShoppingList>("/shopping-list/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ week })
  });
  return normalizeShoppingList(list);
}

export async function updateShoppingListItemChecked(token: string, id: string, checked: boolean) {
  const list = await request<ShoppingList>(`/shopping-list/items/${id}/check`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ checked })
  });
  return normalizeShoppingList(list);
}

export async function addShoppingListItemToInventory(token: string, id: string) {
  const list = await request<ShoppingList>(`/shopping-list/items/${id}/add-to-inventory`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeShoppingList(list);
}

export async function getDashboardData() {
  try {
    const [recipeResults] = await Promise.all([request<typeof recipes>("/recipes/search")]);
    return { inventory, shoppingList, recipes: recipeResults };
  } catch {
    return { inventory, shoppingList, recipes };
  }
}
