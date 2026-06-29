export const unitFamilies = {
  mass: "mass",
  volume: "volume",
  count: "count",
  spoon: "spoon",
  custom: "custom"
};

export const ingredientUnits = [
  { id: "mg", name: "milligramme", abbreviation: "mg", family: unitFamilies.mass, baseUnit: "g", conversionFactor: 0.001, aliases: ["milligramme", "milligrammes"] },
  { id: "g", name: "gramme", abbreviation: "g", family: unitFamilies.mass, baseUnit: "g", conversionFactor: 1, aliases: ["gram", "grams", "gramme", "grammes"] },
  { id: "kg", name: "kilogramme", abbreviation: "kg", family: unitFamilies.mass, baseUnit: "g", conversionFactor: 1000, aliases: ["kilogram", "kilograms", "kilogramme", "kilogrammes"] },
  { id: "ml", name: "millilitre", abbreviation: "ml", family: unitFamilies.volume, baseUnit: "ml", conversionFactor: 1, aliases: ["milliliter", "milliliters", "millilitre", "millilitres"] },
  { id: "cl", name: "centilitre", abbreviation: "cl", family: unitFamilies.volume, baseUnit: "ml", conversionFactor: 10, aliases: ["centilitre", "centilitres"] },
  { id: "l", name: "litre", abbreviation: "l", family: unitFamilies.volume, baseUnit: "ml", conversionFactor: 1000, aliases: ["L", "liter", "liters", "litre", "litres"] },
  { id: "unit", name: "piece", abbreviation: "pc", family: unitFamilies.count, baseUnit: "unit", conversionFactor: 1, aliases: ["", "unite", "unitee", "unité", "unités", "piece", "pieces", "serving", "servings"] },
  { id: "slice", name: "tranche", abbreviation: "tr.", family: unitFamilies.count, baseUnit: "unit", conversionFactor: 1, aliases: ["tranche", "tranches", "slice", "slices"] },
  { id: "can", name: "boite", abbreviation: "boite", family: unitFamilies.count, baseUnit: "unit", conversionFactor: 1, aliases: ["boite", "boites", "boîte", "boîtes", "can", "cans"] },
  { id: "jar", name: "pot", abbreviation: "pot", family: unitFamilies.count, baseUnit: "unit", conversionFactor: 1, aliases: ["pot", "pots", "jar", "jars"] },
  { id: "tbsp", name: "cuillere a soupe", abbreviation: "c. soupe", family: unitFamilies.spoon, baseUnit: "ml", conversionFactor: 14.7868, aliases: ["cuillere a soupe", "cuillère à soupe", "tablespoon", "tablespoons", "tbsp"] },
  { id: "tsp", name: "cuillere a cafe", abbreviation: "c. cafe", family: unitFamilies.spoon, baseUnit: "ml", conversionFactor: 4.92892, aliases: ["cuillere a cafe", "cuillère à café", "teaspoon", "teaspoons", "tsp"] },
  { id: "cup", name: "tasse", abbreviation: "tasse", family: unitFamilies.volume, baseUnit: "ml", conversionFactor: 240, aliases: ["tasse", "tasses", "cup", "cups"] },
  { id: "pinch", name: "pincee", abbreviation: "pincee", family: unitFamilies.custom, baseUnit: null, conversionFactor: null, aliases: ["pincee", "pincée", "pinch"] }
];

export const ingredientUnitIds = ingredientUnits.map((unit) => unit.id);

