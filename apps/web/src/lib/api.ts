import type { InventoryItem, MealPlan, MealType, Recipe, RecipeCatalogResponse, RecipeCatalogSource, RecipeCompatibility, RecipeScore, RecipeSuggestionResponse, ShoppingList, UserProfile } from "@/types/domain";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function getApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
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

  const response = await request<unknown>(`/recipes/suggestions?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeSuggestionsResponse(response);
}

export async function getRecipeCatalog(token: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== "") query.set(key, String(value));
  });

  const response = await request<unknown>(`/recipes/catalog?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeRecipesResponse(response, readCatalogSource(String(params.source || "all")));
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

export async function getRecipeScore(token: string, id: string, source?: Recipe["source"]) {
  const params = source ? `?source=${encodeURIComponent(source)}` : "";
  return request<RecipeScore>(`/recipes/${encodeURIComponent(id)}/score${params}`, {
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
  const response = await request<unknown>("/users/profile", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeUserProfile(response);
}

export async function updateProfile(token: string, payload: {
  firstname?: string;
  lastname?: string;
  householdSize?: number;
  enabledMealTypes?: MealType[];
  availableEquipments?: string[];
  dietaryPreferences?: string[];
  allergies?: string[];
}) {
  const response = await request<unknown>("/users/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  return normalizeUserProfile(response);
}

export function normalizeUserProfile(response: unknown): UserProfile {
  const value = asRecord(response);
  return {
    ...(value as UserProfile),
    _id: String(value._id || ""),
    firstname: String(value.firstname || ""),
    lastname: String(value.lastname || ""),
    email: String(value.email || ""),
    householdSize: Number(value.householdSize || 1),
    enabledMealTypes: asArray<MealType>(value.enabledMealTypes),
    availableEquipments: asArray<string>(value.availableEquipments),
    dietaryPreferences: asArray<string>(value.dietaryPreferences),
    allergies: asArray<string>(value.allergies)
  };
}

export async function getInventory(token: string) {
  const response = await request<unknown>("/inventory", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const value = asRecord(response);
  return asArray<InventoryItem>(Array.isArray(response) ? response : value.items);
}

export async function getMealPlans(token: string, week: string) {
  const response = await request<unknown>(`/meal-plans?week=${encodeURIComponent(week)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const value = asRecord(response);
  return asArray<MealPlan>(Array.isArray(response) ? response : value.items || value.meals);
}

export async function createMealPlan(
  token: string,
  payload: {
    date: string;
    mealType: MealType;
    recipeId: string;
    recipeSource: "api" | "user" | "demo";
    servings?: number;
    metadata?: Record<string, unknown>;
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

export async function generateMealPlanShoppingList(token: string, weekStart: string) {
  const list = await request<ShoppingList>(`/meal-plans/${encodeURIComponent(weekStart)}/shopping-list`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeShoppingList(list);
}

function normalizeShoppingList(list: unknown): ShoppingList {
  const value = asRecord(list);
  const items = asArray<ShoppingList["items"][number]>(value.items);
  const sourceRecipes = asArray<NonNullable<ShoppingList["sourceRecipes"]>[number]>(value.sourceRecipes);
  return {
    ...(value as ShoppingList),
    sourceRecipes,
    items: items.map((item) => ({
      ...item,
      id: item.id || item._id || "",
      sourceRecipes: asArray(item.sourceRecipes)
    }))
  };
}

export function normalizeRecipesResponse(response: unknown, source: RecipeCatalogSource = "all"): RecipeCatalogResponse {
  if (Array.isArray(response)) {
    const items = response as Recipe[];
    return { items, total: items.length, page: 1, limit: items.length, source };
  }

  const value = asRecord(response);
  const items = asArray<Recipe>(value.items || value.recipes || value.results);
  return {
    ...(value as Partial<RecipeCatalogResponse>),
    items,
    total: Number(value.total ?? items.length),
    page: Number(value.page ?? 1),
    limit: Number(value.limit ?? items.length),
    source: readCatalogSource(String(value.source || source))
  };
}

export function normalizeSuggestionsResponse(response: unknown): RecipeSuggestionResponse {
  const emptyGroups: RecipeSuggestionResponse["groups"] = {
    readyToCook: [],
    highlyRecommended: [],
    missingFewIngredients: [],
    lowCompatibility: []
  };

  if (Array.isArray(response)) {
    const suggestions = response as RecipeSuggestionResponse["suggestions"];
    const groups = suggestions.reduce<RecipeSuggestionResponse["groups"]>((acc, suggestion) => {
      if (suggestion.group && acc[suggestion.group]) acc[suggestion.group].push(suggestion);
      return acc;
    }, { ...emptyGroups });
    return {
      summary: {
        totalRecipesAnalyzed: suggestions.length,
        readyToCook: groups.readyToCook.length,
        highlyRecommended: groups.highlyRecommended.length,
        missingFewIngredients: groups.missingFewIngredients.length,
        lowCompatibility: groups.lowCompatibility.length
      },
      suggestions,
      groups
    };
  }

  const value = asRecord(response);
  const rawGroups = asRecord(value.groups);
  const suggestions = asArray<RecipeSuggestionResponse["suggestions"][number]>(value.suggestions);
  const groups: RecipeSuggestionResponse["groups"] = {
    readyToCook: asArray(rawGroups.readyToCook),
    highlyRecommended: asArray(rawGroups.highlyRecommended),
    missingFewIngredients: asArray(rawGroups.missingFewIngredients),
    lowCompatibility: asArray(rawGroups.lowCompatibility)
  };
  const summary = asRecord(value.summary);

  return {
    summary: {
      totalRecipesAnalyzed: Number(summary.totalRecipesAnalyzed ?? suggestions.length),
      readyToCook: Number(summary.readyToCook ?? groups.readyToCook.length),
      highlyRecommended: Number(summary.highlyRecommended ?? groups.highlyRecommended.length),
      missingFewIngredients: Number(summary.missingFewIngredients ?? groups.missingFewIngredients.length),
      lowCompatibility: Number(summary.lowCompatibility ?? groups.lowCompatibility.length)
    },
    suggestions,
    groups
  };
}

export function normalizeShoppingListsResponse(response: unknown): ShoppingList[] {
  if (Array.isArray(response)) return response.map(normalizeShoppingList);

  const value = asRecord(response);
  return asArray<ShoppingList>(value.items || value.lists || value.shoppingLists).map(normalizeShoppingList);
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

export async function getShoppingLists(token: string) {
  const lists = await request<unknown>("/shopping-lists", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeShoppingListsResponse(lists);
}

export async function getShoppingListDetail(token: string, id: string) {
  const list = await request<ShoppingList>(`/shopping-lists/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeShoppingList(list);
}

export async function createShoppingListFromRecipe(token: string, recipeId: string, source?: Recipe["source"]) {
  const params = source ? `?source=${encodeURIComponent(source)}` : "";
  const list = await request<ShoppingList>(`/shopping-lists/from-recipe/${encodeURIComponent(recipeId)}${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({})
  });
  return normalizeShoppingList(list);
}

export async function createShoppingListFromRecipes(token: string, recipeIds: string[]) {
  const list = await request<ShoppingList>("/shopping-lists/from-recipes", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipeIds })
  });
  return normalizeShoppingList(list);
}

export async function updateRecipeShoppingListItemChecked(token: string, listId: string, itemId: string, checked: boolean) {
  const list = await request<ShoppingList>(`/shopping-lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/check`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ checked })
  });
  return normalizeShoppingList(list);
}

export async function deleteShoppingList(token: string, id: string) {
  await request<void>(`/shopping-lists/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function completeShoppingList(token: string, week: string) {
  const list = await request<ShoppingList>("/shopping-list/complete", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ week })
  });
  return normalizeShoppingList(list);
}
