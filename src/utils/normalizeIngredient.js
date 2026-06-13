const pluralSuffixes = [/ies$/i, /es$/i, /s$/i];

export function normalizeIngredientName(value = "") {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, " ")
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
