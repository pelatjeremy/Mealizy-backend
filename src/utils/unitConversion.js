const unitFamilies = {
  weight: { g: 1, kg: 1000 },
  volume: { ml: 1, l: 1000, L: 1000 },
  count: {
    unite: 1,
    "unité": 1,
    tranche: 1,
    boite: 1,
    "boîte": 1,
    pot: 1,
    "cuillère à soupe": 1,
    "cuillère à café": 1
  }
};

function getFamily(unit) {
  return Object.entries(unitFamilies).find(([, units]) => units[unit]);
}

export function subtractQuantities(required, requiredUnit, available, availableUnit) {
  const requiredFamily = getFamily(requiredUnit);
  const availableFamily = getFamily(availableUnit);

  if (!requiredFamily || !availableFamily || requiredFamily[0] !== availableFamily[0]) {
    return Math.max(required - (requiredUnit === availableUnit ? available : 0), 0);
  }

  const requiredBase = required * requiredFamily[1][requiredUnit];
  const availableBase = available * availableFamily[1][availableUnit];
  const missingBase = Math.max(requiredBase - availableBase, 0);

  return Math.round((missingBase / requiredFamily[1][requiredUnit]) * 100) / 100;
}
