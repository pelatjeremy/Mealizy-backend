import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const demoRecipes = [
  {
    source: "demo",
    externalId: "demo-one-pot-pasta",
    title: "One pot pasta",
    image: image("photo-1621996346565-e3dbc646d9a9"),
    preparationTime: 25,
    servings: 2,
    nutrition: { calories: 620, protein: 22, carbs: 78, fat: 24 },
    requiredEquipments: ["plaques"],
    instructions: ["Faire revenir l'ail.", "Ajouter les pâtes, tomates et eau.", "Cuire en remuant jusqu'a absorption."],
    ingredients: [
      ["Pâtes", 200, "g", "epicerie"],
      ["Tomates", 3, "unité", "fruits-legumes"],
      ["Parmesan râpé", 40, "g", "produits-laitiers"],
      ["Basilic frais", 1, "pot", "fruits-legumes"]
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
    instructions: ["Rincer les pois chiches.", "Couper les légumes.", "Assaisonner et mélanger."],
    ingredients: [
      ["Pois chiches", 240, "g", "epicerie"],
      ["Concombre", 1, "unité", "fruits-legumes"],
      ["Tomates", 2, "unité", "fruits-legumes"],
      ["Feta", 80, "g", "produits-laitiers"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-omelette-legumes",
    title: "Omelette aux légumes",
    image: image("photo-1525351484163-7529414344d8"),
    preparationTime: 12,
    servings: 2,
    nutrition: { calories: 390, protein: 27, carbs: 12, fat: 26 },
    requiredEquipments: ["plaques"],
    instructions: ["Battre les oeufs.", "Ajouter les légumes.", "Cuire doucement a la poele."],
    ingredients: [
      ["Oeufs", 4, "unité", "produits-laitiers"],
      ["Poivron rouge", 1, "unité", "fruits-legumes"],
      ["Courgette", 1, "unité", "fruits-legumes"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-curry-legumes",
    title: "Curry de légumes",
    image: image("photo-1565557623262-b51c2513a641"),
    preparationTime: 30,
    servings: 3,
    nutrition: { calories: 540, protein: 14, carbs: 62, fat: 25 },
    requiredEquipments: ["plaques"],
    instructions: ["Faire revenir les légumes.", "Ajouter lait de coco et curry.", "Servir avec du riz."],
    ingredients: [
      ["Riz basmati", 250, "g", "epicerie"],
      ["Courgette", 1, "unité", "fruits-legumes"],
      ["Lait de coco", 400, "ml", "epicerie"],
      ["Curry", 1, "cuillère à soupe", "epicerie"]
    ]
  },
  {
    source: "demo",
    externalId: "demo-gratin-courgettes",
    title: "Gratin de courgettes",
    image: image("photo-1565299624946-b28f40a0ae38"),
    preparationTime: 40,
    servings: 4,
    nutrition: { calories: 430, protein: 19, carbs: 28, fat: 27 },
    requiredEquipments: ["four"],
    instructions: ["Trancher les courgettes.", "Monter le gratin.", "Cuire au four jusqu'a coloration."],
    ingredients: [
      ["Courgette", 3, "unité", "fruits-legumes"],
      ["Mozzarella", 200, "g", "produits-laitiers"],
      ["Crème", 200, "ml", "produits-laitiers"]
    ]
  }
].map((recipe) => ({
  ...recipe,
  ingredients: recipe.ingredients.map(([ingredientName, quantity, unit, category]) => ({
    ingredientName,
    normalizedName: normalizeIngredientName(ingredientName),
    quantity,
    unit,
    category
  }))
}));
