const irregulars = new Map([
  ["oeufs", "oeuf"],
  ["\u0153ufs", "oeuf"],
  ["eggs", "egg"]
]);

export function normalizeIngredient(value = "") {
  const cleaned = String(value)
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['\u2019]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .map((part) => {
      if (irregulars.has(part)) return irregulars.get(part);
      if (part.length > 4 && part.endsWith("ies")) return `${part.slice(0, -3)}y`;
      if (part.length > 4 && /(ches|shes|xes|zes|ses)$/.test(part)) return part.slice(0, -2);
      if (part.length > 3 && part.endsWith("s")) return part.slice(0, -1);
      return part;
    })
    .join(" ");
}

export const normalizeIngredientName = normalizeIngredient;
