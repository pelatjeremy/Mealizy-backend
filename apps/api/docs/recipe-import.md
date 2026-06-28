# Import de Recettes

## Flux Spoonacular

1. Le frontend appelle `POST /api/recipes/import/spoonacular/:id`.
2. `recipeController.importFromSpoonacular` delegue a `recipeService.importSpoonacularRecipe`.
3. `spoonacularService.fetchSpoonacularRecipeById` recupere et mappe la recette externe.
4. Chaque ingredient est normalise via `normalizeRecipeIngredient`.
5. La recette est inseree ou mise a jour avec `sourceProvider: "spoonacular"` et `externalId`.

L'index unique partiel `{ sourceProvider, externalId }` evite les doublons Spoonacular.

## Mapping

`mapSpoonacularRecipe` convertit les champs externes vers le modele `Recipe` :

- temps, portions, image, resume ;
- ingredients bruts avec nom, quantite, unite et metadonnees ;
- instructions analysees ;
- equipements requis ;
- categories, regimes, cuisines et tags ;
- nutrition principale.

L'import final remplace les ingredients bruts par des ingredients enrichis : `ingredientId`, `ingredientName`, `originalName`, `displayName`, `normalizedName`, `amount`, `standardAmount`, `standardUnit`, `sourceMetadata`.

## Gestion des erreurs

`SpoonacularApiError` encapsule les erreurs reseau, quota, cle invalide, mauvais format et indisponibilite externe. Quand la recherche catalogue Spoonacular echoue, l'API retourne un catalogue Mealizy avec un bloc `fallback` explicite.

## Tests RC1

Les tests couvrent :

- mapping d'une recette Spoonacular ;
- absence de cle API ;
- classification d'une erreur de quota ;
- normalisation et creation d'ingredients inconnus ;
- prevention des doublons via l'upsert de recette.

