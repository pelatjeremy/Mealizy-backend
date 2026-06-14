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
  externalId: string;
  title: string;
  image: string;
  preparationTime: number;
  servings: number;
  missingCount?: number;
  missingIngredients?: RecipeIngredient[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: RecipeIngredient[];
};

export type RecipeSuggestionGroups = {
  complete: Recipe[];
  missing1: Recipe[];
  missing2: Recipe[];
  missing3: Recipe[];
  missingMore: Recipe[];
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expirationDate: string;
};

export type ShoppingItem = {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
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
  image: string;
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
