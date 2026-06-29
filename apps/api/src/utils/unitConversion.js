import { ingredientUnits } from "../data/catalogUnits.js";

function normalizeUnitToken(unit = "") {
  return String(unit)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ");
}

const unitAliases = ingredientUnits.reduce((map, unit) => {
  map.set(normalizeUnitToken(unit.id), unit.id);
  map.set(normalizeUnitToken(unit.abbreviation), unit.id);
  for (const alias of unit.aliases || []) map.set(normalizeUnitToken(alias), unit.id);
  return map;
}, new Map());

const conversionFamilies = ingredientUnits.reduce((families, unit) => {
  if (!unit.baseUnit || !unit.conversionFactor) return families;
  families[unit.baseUnit] = { ...(families[unit.baseUnit] || {}), [unit.id]: unit.conversionFactor };
  return families;
}, {});

export function normalizeUnit(unit = "") {
  const normalized = normalizeUnitToken(unit);
  return unitAliases.get(normalized) || normalized || "unit";
}

function getFamily(unit) {
  const normalizedUnit = normalizeUnit(unit);
  return Object.entries(conversionFamilies).find(([, units]) => units[normalizedUnit]);
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

