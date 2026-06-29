import { InventoryItem, MealType, Recipe, ShoppingItem } from "@/types/domain";

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const inventory: InventoryItem[] = [
  { id: "1", name: "Tomates", quantity: 5, unit: "unités", category: "Fruits & Légumes", expirationDate: "2024-05-28" },
  { id: "2", name: "Oeufs", quantity: 6, unit: "unités", category: "Produits laitiers", expirationDate: "2024-06-02" },
  { id: "3", name: "Riz basmati", quantity: 500, unit: "g", category: "Épicerie", expirationDate: "2024-07-15" },
  { id: "4", name: "Blanc de poulet", quantity: 2, unit: "pièces", category: "Viandes & Poissons", expirationDate: "2024-05-29" },
  { id: "5", name: "Lait demi-écrémé", quantity: 1, unit: "L", category: "Produits laitiers", expirationDate: "2024-06-05" }
];

export const shoppingList: ShoppingItem[] = [
  { id: "1", ingredientName: "Poivron rouge", quantity: 2, unit: "unités", category: "Fruits & Légumes", checked: false },
  { id: "2", ingredientName: "Courgette", quantity: 1, unit: "unité", category: "Fruits & Légumes", checked: false },
  { id: "3", ingredientName: "Mozzarella", quantity: 200, unit: "g", category: "Produits laitiers", checked: false },
  { id: "4", ingredientName: "Basilic frais", quantity: 1, unit: "bouquet", category: "Fruits & Légumes", checked: false },
  { id: "5", ingredientName: "Parmesan râpé", quantity: 100, unit: "g", category: "Produits laitiers", checked: false }
];

export const recipes: Recipe[] = [
  { externalId: "demo-one-pot-pasta", source: "demo", title: "One pot pasta", image: img("photo-1621996346565-e3dbc646d9a9"), preparationTime: 25, servings: 2, missingCount: 0, missingIngredients: [], nutrition: { calories: 620, protein: 22, carbs: 78, fat: 24 }, ingredients: [] },
  { externalId: "demo-salade-pois-chiches", source: "demo", title: "Salade de pois chiches", image: img("photo-1512621776951-a57141f2eefd"), preparationTime: 15, servings: 2, missingCount: 0, missingIngredients: [], nutrition: { calories: 460, protein: 18, carbs: 52, fat: 19 }, ingredients: [] },
  { externalId: "demo-omelette-tomate", source: "demo", title: "Omelette tomate", image: img("photo-1525351484163-7529414344d8"), preparationTime: 12, servings: 2, missingCount: 0, missingIngredients: [], nutrition: { calories: 360, protein: 25, carbs: 10, fat: 24 }, ingredients: [] },
  { externalId: "demo-pad-thai", title: "Pad thaï", image: img("photo-1559314809-0d155014e29e"), preparationTime: 28, servings: 2, missingCount: 1, nutrition: { calories: 680, protein: 24, carbs: 82, fat: 28 }, ingredients: [] },
  { externalId: "demo-curry-legumes", title: "Curry de légumes", image: img("photo-1565557623262-b51c2513a641"), preparationTime: 30, servings: 3, missingCount: 1, nutrition: { calories: 540, protein: 14, carbs: 62, fat: 25 }, ingredients: [] },
  { externalId: "demo-tacos", title: "Tacos maison", image: img("photo-1565299585323-38d6b0865b47"), preparationTime: 20, servings: 2, missingCount: 1, nutrition: { calories: 610, protein: 30, carbs: 60, fat: 26 }, ingredients: [] },
  { externalId: "demo-bolognaise", source: "demo", title: "Pâtes bolognaise", image: img("photo-1622973536968-3ead9e780960"), preparationTime: 35, servings: 4, missingCount: 2, nutrition: { calories: 720, protein: 34, carbs: 86, fat: 22 }, ingredients: [] },
  { externalId: "demo-gratin", title: "Gratin de courgettes", image: img("photo-1565299624946-b28f40a0ae38"), preparationTime: 40, servings: 4, missingCount: 2, nutrition: { calories: 430, protein: 19, carbs: 28, fat: 27 }, ingredients: [] },
  { externalId: "demo-ratatouille", title: "Ratatouille", image: img("photo-1604909052743-94e838986d24"), preparationTime: 45, servings: 4, missingCount: 2, nutrition: { calories: 260, protein: 8, carbs: 34, fat: 10 }, ingredients: [] },
  { externalId: "demo-sushi", title: "Sushi maison", image: img("photo-1579584425555-c3ce17fd4351"), preparationTime: 55, servings: 2, missingCount: 3, nutrition: { calories: 520, protein: 25, carbs: 75, fat: 12 }, ingredients: [] },
  { externalId: "demo-burger", title: "Burger maison", image: img("photo-1568901346375-23c9450c58cd"), preparationTime: 35, servings: 2, missingCount: 3, nutrition: { calories: 820, protein: 42, carbs: 64, fat: 44 }, ingredients: [] },
  { externalId: "demo-moussaka", title: "Moussaka", image: img("photo-1600891964599-f61ba0e24092"), preparationTime: 60, servings: 4, missingCount: 3, nutrition: { calories: 650, protein: 31, carbs: 44, fat: 37 }, ingredients: [] }
];

export const weekMeals: Record<MealType, string[]> = {
  breakfast: ["Porridge fruits rouges", "Smoothie banane", "Yaourt granola", "Tartines avocat", "Porridge chocolat", "Pancakes", "Smoothie bowl"],
  lunch: ["Salade quinoa", "Poulet curry", "Pâtes pesto", "Bowl saumon", "Wrap légumes", "Chili sin carne", "Quiche légumes"],
  dinner: ["Saumon riz brocoli", "Lasagnes", "Wok légumes", "Poulet rôti", "Soupe lentilles", "Pizza maison", "Gratin dauphinois"],
  snack: ["Pomme", "Amandes", "Yaourt", "Banane", "Noix", "Fromage blanc", "Fraises"]
};
