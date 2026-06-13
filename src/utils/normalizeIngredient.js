const pluralSuffixes = [/ies$/i, /es$/i, /s$/i];
const replacements = [
  [/œ/g, "oe"],
  [/æ/g, "ae"],
  [/['’]/g, " "]
];

export function normalizeIngredientName(value = "") {
  const normalizedValue = replacements.reduce((text, [pattern, replacement]) => {
    return text.replace(pattern, replacement);
  }, value.toLowerCase());

  const cleaned = normalizedValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ");

  return cleaned
    .split(" ")
    .map((part) => pluralSuffixes.reduce((name, suffix) => {
      if (name.length > 3 && suffix.test(name)) return name.replace(suffix, "");
      return name;
    }, part))
    .join(" ");
}
