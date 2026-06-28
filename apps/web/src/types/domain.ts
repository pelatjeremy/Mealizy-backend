export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type RecipeIngredient = {
  ingredientId?: string;
  ingredientName: string;
  originalName?: string;
  displayName?: string;
  normalizedName: string;
  quantity: number;
  amount?: number;
  unit: string;
  originalUnit?: string;
  standardAmount?: number;
  standardUnit?: string;
  category: string;
  aisle?: string;
  image?: string;
  sourceMetadata?: Record<string, unknown>;
};

export type Recipe = {
  _id?: string;
  id?: string;
  source?: "api" | "user" | "demo";
  sourceProvider?: "spoonacular" | "mealizy" | "user" | "demo";
  externalId?: string;
  isImported?: boolean;
  importedRecipeId?: string;
  mealizyRecipeId?: string;
  title: string;
  image?: string;
  summary?: string;
  description?: string;
  preparationTime: number;
  cookingTime?: number;
  readyInMinutes?: number;
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
    fiber?: number;
    sugar?: number;
    sodium?: number;
    nutrients?: Array<{ name?: string; amount?: number; unit?: string; percentOfDailyNeeds?: number }>;
  };
  ingredients: RecipeIngredient[];
  instructions?: string[];
  requiredEquipments?: string[];
  categories?: string[];
  diets?: string[];
  cuisines?: string[];
  tags?: string[];
  importedAt?: string;
  updatedAt?: string;
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

export type RecipeCompatibilityIngredient = {
  ingredientId?: string;
  ingredientName: string;
  normalizedName: string;
  requiredQuantity: number;
  requiredUnit: string;
  unit: string;
  status: "disponible" | "partiel" | "manquant";
  matchType?: "ingredientId" | "normalizedName" | null;
  quantityComparable?: boolean;
  availableQuantity?: number;
  missingQuantity?: number;
};

export type RecipeCompatibility = {
  recipeId: string;
  totalIngredients: number;
  availableIngredients: number;
  missingIngredients: number;
  partialIngredients: number;
  compatibilityScore: number;
  matched: RecipeCompatibilityIngredient[];
  missing: RecipeCompatibilityIngredient[];
  partial: RecipeCompatibilityIngredient[];
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
  date: string;
  mealDate?: string;
  weekStartDate: string;
  day: MealPlanDay;
  mealType: MealType;
  recipeId: string;
  recipeSource: "api" | "user" | "demo";
  servings: number;
  recipe?: MealPlanRecipe;
};
