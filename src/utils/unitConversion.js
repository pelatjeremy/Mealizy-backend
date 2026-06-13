const unitAliases = {
  liter: "ml",
  litre: "ml",
  litres: "ml",
  kilogramme: "g",
  kilogrammes: "g",
  "unité": "unite",
  "unités": "unite",
  unite: "unite",
  unites: "unite",
  unit: "unite",
  units: "unite",
  piece: "unite",
  pieces: "unite",
  "pièce": "unite",
  "pièces": "unite",
  boite: "boite",
  "boîte": "boite",
  boites: "boite",
  "boîtes": "boite",
  tbsp: "cuillere-a-soupe",
  "cuillère à soupe": "cuillere-a-soupe",
  "cuillere a soupe": "cuillere-a-soupe",
  tsp: "cuillere-a-cafe",
  "cuillère à café": "cuillere-a-cafe",
  "cuillere a cafe": "cuillere-a-cafe"
};

const unitFamilies = {
  weight: { g: 1, kg: 1000 },
  volume: { ml: 1, l: 1000, L: 1000 },
  count: {
    unite: 1,
    tranche: 1,
    boite: 1,
    pot: 1,
    "cuillere-a-soupe": 1,
    "cuillere-a-cafe": 1
  }
};

export function normalizeUnit(unit = "unite") {
  const value = String(unit).trim();
  return unitAliases[value] || unitAliases[value.toLowerCase()] || value;
}

function getFamily(unit) {
  const normalizedUnit = normalizeUnit(unit);
  return Object.entries(unitFamilies).find(([, units]) => units[normalizedUnit]);
}

export function subtractQuantities(required, requiredUnit, available, availableUnit) {
  const normalizedRequiredUnit = normalizeUnit(requiredUnit);
  const normalizedAvailableUnit = normalizeUnit(availableUnit);
  const requiredFamily = getFamily(normalizedRequiredUnit);
  const availableFamily = getFamily(normalizedAvailableUnit);

  if (!requiredFamily || !availableFamily || requiredFamily[0] !== availableFamily[0]) {
    return Math.max(required - (normalizedRequiredUnit === normalizedAvailableUnit ? available : 0), 0);
  }

  const requiredBase = required * requiredFamily[1][normalizedRequiredUnit];
  const availableBase = available * availableFamily[1][normalizedAvailableUnit];
  const missingBase = Math.max(requiredBase - availableBase, 0);

  return Math.round((missingBase / requiredFamily[1][normalizedRequiredUnit]) * 100) / 100;
}
