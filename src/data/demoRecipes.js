import { normalizeIngredientName } from "../utils/normalizeIngredient.js";
import { normalizeUnit } from "../utils/unitConversion.js";

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const recipes = [
  {
    source: "demo",
    externalId: "demo-pates-bolognaise",
    title: "Pates bolognaise",
    image: image("photo-1621996346565-e3dbc646d9a9"),
    preparationTime: 25,
    servings: 2,
    nutrition: { calories: 640, protein: 33, carbs: 82, fat: 18 },
    requiredEquipments: ["plaques"],
    instructions: ["Cuire les pates.", "Faire revenir la viande hachee.", "Ajouter les tomates et melanger."],
    ingredients: [
      ["Pates", 200, "g", "epicerie"],
      ["Tomates", 3, "unit", "fruits-legumes"],
      ["Viande hachee", 250, "g", "viandes-poissons"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-gratin-pates",
    title: "Gratin de pates",
    image: image("photo-1565299624946-b28f40a0ae38"),
    preparationTime: 35,
    servings: 2,
    nutrition: { calories: 710, protein: 26, carbs: 88, fat: 28 },
    requiredEquipments: ["four"],
    instructions: ["Cuire les pates.", "Preparer une sauce au lait.", "Ajouter le fromage et gratiner."],
    ingredients: [
      ["Pates", 220, "g", "epicerie"],
      ["Lait", 300, "ml", "produits-laitiers"],
      ["Fromage", 120, "g", "produits-laitiers"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-bolognaise",
    title: "Pates bolognaise",
    image: image("photo-1622973536968-3ead9e780960"),
    preparationTime: 35,
    servings: 4,
    nutrition: { calories: 720, protein: 34, carbs: 86, fat: 22 },
    requiredEquipments: ["plaques"],
    instructions: ["Cuire les pates.", "Faire mijoter la sauce tomate avec la viande.", "Melanger et servir chaud."],
    ingredients: [
      ["Pates", 400, "g", "epicerie"],
      ["Tomates", 4, "unit", "fruits-legumes"],
      ["Viande hachee", 300, "g", "viandes-poissons"],
      ["Parmesan rape", 60, "g", "produits-laitiers"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-omelette-tomate",
    title: "Omelette tomate",
    image: image("photo-1525351484163-7529414344d8"),
    preparationTime: 12,
    servings: 2,
    nutrition: { calories: 360, protein: 24, carbs: 10, fat: 24 },
    requiredEquipments: ["plaques"],
    instructions: ["Battre les oeufs.", "Ajouter les tomates.", "Cuire doucement a la poele."],
    ingredients: [
      ["Oeufs", 4, "unit", "produits-laitiers"],
      ["Tomates", 2, "unit", "fruits-legumes"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-salade-pois-chiches",
    title: "Salade de pois chiches",
    image: image("photo-1512621776951-a57141f2eefd"),
    preparationTime: 15,
    servings: 2,
    nutrition: { calories: 460, protein: 18, carbs: 52, fat: 19 },
    requiredEquipments: [],
    instructions: ["Rincer les pois chiches.", "Couper les legumes.", "Assaisonner et melanger."],
    ingredients: [
      ["Pois chiches", 240, "g", "epicerie"],
      ["Concombre", 1, "unit", "fruits-legumes"],
      ["Tomates", 2, "unit", "fruits-legumes"],
      ["Feta", 80, "g", "produits-laitiers"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-curry-legumes",
    title: "Curry de legumes",
    image: image("photo-1565557623262-b51c2513a641"),
    preparationTime: 30,
    servings: 3,
    nutrition: { calories: 540, protein: 14, carbs: 62, fat: 25 },
    requiredEquipments: ["plaques"],
    instructions: ["Faire revenir les legumes.", "Ajouter lait de coco et curry.", "Servir avec du riz."],
    ingredients: [
      ["Riz basmati", 250, "g", "epicerie"],
      ["Courgette", 1, "unit", "fruits-legumes"],
      ["Lait de coco", 400, "ml", "epicerie"],
      ["Curry", 1, "tbsp", "epicerie"]
    ]
  }
];

export const demoRecipes = recipes.map((recipe) => ({
  ...recipe,
  ingredients: recipe.ingredients.map(([ingredientName, quantity, unit, category]) => ({
    ingredientName,
    normalizedName: normalizeIngredientName(ingredientName),
    quantity,
    unit: normalizeUnit(unit),
    category
  }))
}));
