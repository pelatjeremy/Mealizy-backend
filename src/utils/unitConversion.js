const unitAliases = new Map([
  ["", "unit"],
  ["unit", "unit"],
  ["unite", "unit"],
  ["unitee", "unit"],
  ["unités", "unit"],
  ["unité", "unit"],
  ["piece", "unit"],
  ["pieces", "unit"],
  ["serving", "unit"],
  ["servings", "unit"],
  ["g", "g"],
  ["gram", "g"],
  ["grams", "g"],
  ["gramme", "g"],
  ["grammes", "g"],
  ["kg", "kg"],
  ["kilogram", "kg"],
  ["kilograms", "kg"],
  ["kilogramme", "kg"],
  ["kilogrammes", "kg"],
  ["ml", "ml"],
  ["milliliter", "ml"],
  ["milliliters", "ml"],
  ["millilitre", "ml"],
  ["millilitres", "ml"],
  ["l", "l"],
  ["liter", "l"],
  ["liters", "l"],
  ["litre", "l"],
  ["litres", "l"],
  ["tranche", "slice"],
  ["tranches", "slice"],
  ["slice", "slice"],
  ["slices", "slice"],
  ["boite", "can"],
  ["boites", "can"],
  ["can", "can"],
  ["cans", "can"],
  ["pot", "jar"],
  ["pots", "jar"],
  ["jar", "jar"],
  ["jars", "jar"],
  ["cuillere a soupe", "tbsp"],
  ["tablespoon", "tbsp"],
  ["tablespoons", "tbsp"],
  ["tbsp", "tbsp"],
  ["cuillere a cafe", "tsp"],
  ["teaspoon", "tsp"],
  ["teaspoons", "tsp"],
  ["tsp", "tsp"]
]);

const unitFamilies = {
  weight: { g: 1, kg: 1000 },
  volume: { ml: 1, l: 1000, tbsp: 14.7868, tsp: 4.92892 },
  count: { unit: 1, slice: 1, can: 1, jar: 1 }
};

export function normalizeUnit(unit = "") {
  const normalized = String(unit)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ");

  return unitAliases.get(normalized) || normalized || "unit";
}

function getFamily(unit) {
  const normalizedUnit = normalizeUnit(unit);
  return Object.entries(unitFamilies).find(([, units]) => units[normalizedUnit]);
}

export function addQuantities(currentQuantity, currentUnit, addedQuantity, addedUnit) {
  const currentFamily = getFamily(currentUnit);
  const addedFamily = getFamily(addedUnit);
  const normalizedCurrentUnit = normalizeUnit(currentUnit);
  const normalizedAddedUnit = normalizeUnit(addedUnit);

  if (!currentFamily || !addedFamily || currentFamily[0] !== addedFamily[0]) {
    return normalizedCurrentUnit === normalizedAddedUnit ? currentQuantity + addedQuantity : currentQuantity;
  }

  const currentBase = currentQuantity * currentFamily[1][normalizedCurrentUnit];
  const addedBase = addedQuantity * addedFamily[1][normalizedAddedUnit];
  return Math.round(((currentBase + addedBase) / currentFamily[1][normalizedCurrentUnit]) * 100) / 100;
}

export function subtractQuantities(required, requiredUnit, available, availableUnit) {
  const requiredFamily = getFamily(requiredUnit);
  const availableFamily = getFamily(availableUnit);
  const normalizedRequiredUnit = normalizeUnit(requiredUnit);
  const normalizedAvailableUnit = normalizeUnit(availableUnit);

  if (!requiredFamily || !availableFamily || requiredFamily[0] !== availableFamily[0]) {
    return Math.max(required - (normalizedRequiredUnit === normalizedAvailableUnit ? available : 0), 0);
  }

  const requiredBase = required * requiredFamily[1][normalizedRequiredUnit];
  const availableBase = available * availableFamily[1][normalizedAvailableUnit];
  const missingBase = Math.max(requiredBase - availableBase, 0);

  return Math.round((missingBase / requiredFamily[1][normalizedRequiredUnit]) * 100) / 100;
}
