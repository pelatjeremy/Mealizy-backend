export const recipeScoreConfig = {
  weights: {
    availability: 0.42,
    quantity: 0.24,
    essential: 0.24,
    missingImpact: 0.1
  },
  importanceWeights: {
    essential: 1,
    important: 0.65,
    optional: 0.25
  },
  recommendationThresholds: {
    cookNow: 88,
    almostReady: 72,
    shoppingNeeded: 25
  },
  optionalKeywords: [
    "sel",
    "poivre",
    "persil",
    "coriandre",
    "basilic",
    "ciboulette",
    "menthe",
    "thym",
    "romarin",
    "origan",
    "paprika",
    "cumin",
    "cannelle",
    "epice",
    "epices",
    "huile",
    "vinaigre",
    "sauce"
  ],
  optionalCategories: ["epices", "herbes", "herbes-epices", "condiments", "sauces"],
  essentialCategories: [
    "viandes-poissons",
    "viandes",
    "volaille",
    "poissons",
    "fruits-de-mer",
    "oeufs",
    "legumineuses",
    "feculents",
    "produits-laitiers"
  ]
};
