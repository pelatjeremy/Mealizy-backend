import type { InventoryItem, MealPlan, MealPlanDay, MealType, Recipe, RecipeCatalogResponse, RecipeCatalogSource, RecipeCompatibility, ShoppingList, UserProfile } from "@/types/domain";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function getApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = new URL(API_URL);
  const apiPath = apiUrl.pathname.endsWith("/") ? apiUrl.pathname.slice(0, -1) : apiUrl.pathname;
  const requestPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${apiPath}${requestPath}`, apiUrl.origin);
  apiUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || `API request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRecipeSuggestions(token: string, params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== "") query.set(key, String(value));
  });

  return request<Recipe[]>(`/recipes/suggestions?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getRecipeCatalog(token: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== "") query.set(key, String(value));
  });

  return request<RecipeCatalogResponse>(`/recipes/catalog?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createRecipe(token: string, payload: {
  title: string;
  image?: string;
  preparationTime: number;
  servings: number;
  ingredients: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    category: string;
  }>;
  instructions: string[];
}) {
  return request<Recipe>("/recipes", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateRecipe(token: string, id: string, payload: {
  title: string;
  image?: string;
  preparationTime: number;
  servings: number;
  ingredients: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    category: string;
  }>;
  instructions: string[];
}) {
  return request<Recipe>(`/recipes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function importSpoonacularRecipe(token: string, id: string) {
  return request<Recipe>(`/recipes/import/spoonacular/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function readCatalogSource(source: string): RecipeCatalogSource {
  return source === "mine" || source === "mealizy" || source === "api" ? source : "all";
}

export async function getRecipe(id: string, source?: Recipe["source"], token?: string) {
  const params = source ? `?source=${encodeURIComponent(source)}` : "";
  return request<Recipe>(`/recipes/${encodeURIComponent(id)}${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

export async function getRecipeCompatibility(token: string, id: string, source?: Recipe["source"]) {
  const params = source ? `?source=${encodeURIComponent(source)}` : "";
  return request<RecipeCompatibility>(`/recipes/${encodeURIComponent(id)}/compatibility${params}`, {
    headers: { Authorization: `Bearer ${token}` }
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

export async function getInventory(token: string) {
  return request<InventoryItem[]>("/inventory", {
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

export async function completeShoppingList(token: string, week: string) {
  const list = await request<ShoppingList>("/shopping-list/complete", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ week })
  });
  return normalizeShoppingList(list);
}
