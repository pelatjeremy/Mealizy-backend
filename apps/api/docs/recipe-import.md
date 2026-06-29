# Import et Synchronisation de Recettes

## Principe RC1+

Spoonacular n'est plus interroge pendant les recherches utilisateur. Les recherches et suggestions lisent uniquement MongoDB.

Spoonacular sert de source d'alimentation du catalogue Mealzy via une synchronisation explicite.

## Synchronisation Spoonacular

La commande suivante alimente le catalogue :

```bash
corepack yarn workspace @mealizy/api sync:spoonacular --query pasta --limit 24
```

Le service `spoonacularSyncService.js` :

- recherche des recettes sur Spoonacular ;
- enrichit les ingredients avec `ingredientMatcher.js` ;
- insere les nouvelles recettes ;
- met a jour les recettes Spoonacular deja connues ;
- ignore les doublons presents dans un meme lot ;
- retourne un rapport avec recettes analysees, nouvelles, mises a jour, doublons, ingredients et quota restant si disponible.

L'operation est idempotente grace a l'identifiant `{ sourceProvider: "spoonacular", externalId }`.

## Import ponctuel

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

Ce flux reste disponible cote API, mais la recherche utilisateur ne l'utilise plus.

## Gestion des erreurs et quota

`SpoonacularApiError` encapsule les erreurs reseau, quota, cle invalide, mauvais format et indisponibilite externe. Ces erreurs sont traitees par la synchronisation et ne sont pas exposees directement au frontend utilisateur.

La synchronisation journalise les situations suivantes sans exposer la cle :

- quota depasse ;
- cle invalide ;
- indisponibilite temporaire ;
- erreur reseau.

## Tests RC1

Les tests couvrent :

- mapping d'une recette Spoonacular ;
- absence de cle API ;
- classification d'une erreur de quota ;
- normalisation et creation d'ingredients inconnus ;
- prevention des doublons via l'upsert de recette ;
- recherche utilisateur MongoDB-only ;
- synchronisation Spoonacular idempotente.
