import mongoose from "mongoose";
import { ingredientCategoryIds } from "../data/catalogCategories.js";
import { Ingredient } from "../models/Ingredient.js";
import { normalizeIngredientName } from "../utils/normalizeIngredient.js";

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function slugify(value = "") {
  return normalizeIngredientName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function compactStringList(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampPage(value) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function clampLimit(value) {
  const limit = Number(value || 25);
  return Math.min(Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 25, 100);
}

function buildSearchQuery({ q, category, active = "true" } = {}) {
  const query = {};
  if (active !== "all") query.active = active === true || active === "true";
  if (category) query.category = String(category);

  const normalizedQuery = normalizeIngredientName(q || "");
  if (normalizedQuery) {
    const rawQuery = String(q).trim();
    const escapedRawQuery = escapeRegex(rawQuery);
    const escapedNormalizedQuery = escapeRegex(normalizedQuery);

    query.$or = [
      { normalizedName: { $regex: escapedNormalizedQuery, $options: "i" } },
      { name: { $regex: escapedRawQuery, $options: "i" } },
      { synonyms: { $regex: escapedRawQuery, $options: "i" } },
      { alternativeSpellings: { $regex: escapedRawQuery, $options: "i" } },
      { plurals: { $regex: escapedRawQuery, $options: "i" } },
      { "translations.fr": { $regex: escapedRawQuery, $options: "i" } },
      { "translations.en": { $regex: escapedRawQuery, $options: "i" } }
    ];
  }

  return query;
}

function normalizeIngredientPayload(payload = {}) {
  const name = String(payload.name || "").trim();
  if (!name) throw badRequest("Ingredient name is required");

  const category = String(payload.category || "autres").trim();
  if (!ingredientCategoryIds.includes(category)) throw badRequest("Ingredient category is invalid");

  const normalizedName = normalizeIngredientName(payload.normalizedName || name);
  const slug = String(payload.slug || slugify(name)).trim().toLowerCase();

  return {
    name,
    slug,
    stableId: String(payload.stableId || slug).trim(),
    normalizedName,
    category,
    subcategory: String(payload.subcategory || "").trim(),
    synonyms: compactStringList(payload.synonyms),
    translations: {
      fr: compactStringList(payload.translations?.fr),
      en: compactStringList(payload.translations?.en)
    },
    alternativeSpellings: compactStringList(payload.alternativeSpellings),
    plurals: compactStringList(payload.plurals),
    image: String(payload.image || "").trim(),
    icon: String(payload.icon || "").trim(),
    nutritionReference: payload.nutritionReference || {},
    source: payload.source || "mealizy",
    active: payload.active !== undefined ? Boolean(payload.active) : true,
    notes: String(payload.notes || "").trim()
  };
}

export async function findOrCreateIngredient({ name, category = "autres" }) {
  const normalizedName = normalizeIngredientName(name);
  const slug = slugify(name);
  return Ingredient.findOneAndUpdate(
    { normalizedName },
    { $setOnInsert: { name, slug, stableId: slug, normalizedName, category, source: "user", active: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function listIngredients(params = {}) {
  const page = clampPage(params.page);
  const limit = clampLimit(params.limit);
  const skip = (page - 1) * limit;
  const query = buildSearchQuery(params);

  const [items, total] = await Promise.all([
    Ingredient.find(query)
      .sort({ active: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Ingredient.countDocuments(query)
  ]);

  return { items, total, page, limit };
}

export async function searchIngredients(params = {}) {
  return listIngredients({ ...params, limit: params.limit || 15 });
}

export async function getIngredientById(id) {
  const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
  const ingredient = await Ingredient.findOne(query).lean();
  if (!ingredient) throw notFound("Ingredient not found");
  return ingredient;
}

export async function createIngredient(payload) {
  return Ingredient.create(normalizeIngredientPayload(payload));
}

export async function updateIngredient(id, payload) {
  const existing = await Ingredient.findById(id);
  if (!existing) throw notFound("Ingredient not found");

  Object.assign(existing, normalizeIngredientPayload({ ...existing.toObject(), ...payload }));
  await existing.save();
  return existing.toObject();
}

export async function deactivateIngredient(id) {
  const ingredient = await Ingredient.findByIdAndUpdate(id, { active: false }, { new: true }).lean();
  if (!ingredient) throw notFound("Ingredient not found");
  return ingredient;
}

export async function mergeIngredients(sourceId, targetId) {
  if (String(sourceId) === String(targetId)) throw badRequest("Source and target ingredients must be different");

  const [source, target] = await Promise.all([
    Ingredient.findById(sourceId),
    Ingredient.findById(targetId)
  ]);

  if (!source) throw notFound("Source ingredient not found");
  if (!target) throw notFound("Target ingredient not found");

  target.synonyms = compactStringList([...(target.synonyms || []), source.name, ...(source.synonyms || [])]);
  target.alternativeSpellings = compactStringList([...(target.alternativeSpellings || []), ...(source.alternativeSpellings || [])]);
  target.plurals = compactStringList([...(target.plurals || []), ...(source.plurals || [])]);
  target.translations = {
    fr: compactStringList([...(target.translations?.fr || []), ...(source.translations?.fr || [])]),
    en: compactStringList([...(target.translations?.en || []), ...(source.translations?.en || [])])
  };
  await target.save();

  source.active = false;
  source.mergedInto = target._id;
  await source.save();

  return { source: source.toObject(), target: target.toObject() };
}
