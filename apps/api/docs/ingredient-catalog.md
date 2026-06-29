# Catalogue Ingredients

## Role

Le catalogue centralise les ingredients utilisables par l'inventaire, les recettes importees et les futures fonctions de scoring. Il evite de maintenir plusieurs referentiels concurrents pour les noms, categories, unites et alias.

## Modele

`Ingredient` est le document canonique. Les champs structurants sont :

- `name`, `slug`, `stableId` pour l'identification lisible et stable ;
- `normalizedName` pour les recherches et le matching ;
- `category`, `subcategory` pour le classement ;
- `synonyms`, `translations`, `alternativeSpellings`, `plurals` pour les alias ;
- `nutritionReference` pour une base nutritionnelle optionnelle ;
- `source`, `importMetadata`, `active`, `mergedInto` pour tracer l'origine et les fusions.

Les index importants couvrent `slug`, `stableId`, `normalizedName`, `active`, `category` et la recherche texte.

## Categories et unites

Les categories sont code-administrees dans `data/catalogCategories.js`. Les identifiants historiques comme `fruits-legumes`, `epicerie`, `produits-laitiers`, `viandes-poissons`, `surgeles` et `autres` sont conserves pour la compatibilite.

Les unites sont definies dans `data/catalogUnits.js`. `normalizeUnit` accepte les alias usuels et retourne un identifiant canonique (`g`, `kg`, `ml`, `unit`, `tbsp`, etc.).

## Services

- `ingredientService.js` gere la recherche, la creation, la mise a jour, la desactivation et la fusion.
- `categoryService.js` expose les categories.
- `unitService.js` expose les unites.
- `ingredientNormalizer.js` produit des noms comparables.
- `ingredientMatcher.js` cherche un ingredient existant ou cree un ingredient externe en fallback.

## API

Les routes publiques de lecture sont sous `/api/catalog` :

- `GET /ingredients`
- `GET /ingredients/search`
- `GET /ingredients/:id`
- `GET /categories`
- `GET /units`

Les routes d'administration (`POST`, `PUT`, merge, desactivation) demandent une authentification.

## Points de vigilance RC1

- Les recherches echappent les caracteres regex provenant de l'utilisateur.
- Les creations valident la categorie avant insertion.
- Les ingredients auto-crees par Spoonacular restent actifs mais marques `source: "external"`.
- Les fusions conservent les alias sur la cible et desactivent la source.

