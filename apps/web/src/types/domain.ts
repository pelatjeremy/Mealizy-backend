export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type RecipeIngredient = {
  ingredientName: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  category: string;
};

export type Recipe = {
  _id?: string;
  id?: string;
  source?: "api" | "user" | "demo";
  externalId?: string;
  title: string;
  image?: string;
  preparationTime: number;
  servings: number;
  score?: number;
  coverage?: number;
  availableIngredientCount?: number;
  missingCount?: number;
  missingIngredients?: RecipeIngredient[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: RecipeIngredient[];
  instructions?: string[];
  requiredEquipments?: string[];
  categories?: string[];
  diets?: string[];
};

export type RecipeCatalogSource = "mine" | "mealizy" | "api" | "all";

export type RecipeCatalogResponse = {
  items: Recipe[];
  total: number;
  page: number;
  limit: number;
  source: RecipeCatalogSource;
  fallback?: {
    active: boolean;
    source: "mealizy";
    reason: "quota_exceeded" | "invalid_key" | "network_error" | "unexpected_format" | "bad_request" | "spoonacular_unavailable" | "unknown";
    spoonacularStatus: number | null;
    message: string;
  };
};

export type InventoryItem = {
  id?: string;
  _id?: string;
  name?: string;
  ingredientId?: {
    name?: string;
    category?: string;
  };
  quantity: number;
  unit: string;
  category?: string;
  expirationDate?: string;
};

export type ShoppingItem = {
  id: string;
  _id?: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
};

export type ShoppingList = {
  _id?: string;
  userId?: string;
  weekStartDate: string;
  items: ShoppingItem[];
  generatedAt?: string;
  isCompleted?: boolean;
};

export type UserProfile = {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  householdSize?: number;
  enabledMealTypes: MealType[];
};

export type MealPlanDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type MealPlanRecipe = {
  id: string;
  source: "api" | "user" | "demo";
  title: string;
  image?: string;
  preparationTime: number;
  calories: number;
  servings: number;
};

export type MealPlan = {
  _id: string;
  userId: string;
  weekStartDate: string;
  day: MealPlanDay;
  mealType: MealType;
  recipeId: string;
  recipeSource: "api" | "user" | "demo";
  servings: number;
  recipe?: MealPlanRecipe;
};
