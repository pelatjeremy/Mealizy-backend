# Architecture Technique RC1

## Vue d'ensemble

Mealizy est un monorepo Yarn avec deux workspaces :

- `apps/api` : API Express, MongoDB/Mongoose, JWT, services metier.
- `apps/web` : Next.js App Router, React, TypeScript, appels API centralises dans `src/lib/api.ts`.

La separation principale est la suivante : routes HTTP -> controleurs -> services -> modeles Mongoose. Les controleurs doivent rester minces et les services portent les regles metier.

## Backend

Les modeles principaux sont :

- `User` : profil, preferences, allergies, equipements, foyer.
- `Ingredient` : catalogue canonique et alias.
- `InventoryItem` : stock utilisateur lie a un ingredient canonique.
- `Recipe` : recettes utilisateur, demo et Spoonacular, avec ingredients enrichis.
- `MealPlan` et `ShoppingList` : planification et courses.

Les services critiques pour RC1 sont :

- `spoonacularService.js` : client externe et mapping brut.
- `ingredientNormalizer.js` et `ingredientMatcher.js` : normalisation et rattachement catalogue.
- `recipeIngredientMigrationService.js` : migration des anciennes recettes.
- `recipeInventoryMatcher.js` : comparaison inventaire / recette.
- `recipeService.js` : catalogue, import, suggestions et detail.

## Frontend

Les pages recette utilisent :

- `/recipes` pour le catalogue, les filtres, l'import et la planification.
- `/recipes/[id]` pour le detail, la nutrition et la compatibilite inventaire.
- `RecipePlanningModal` pour rattacher une recette a un repas.

Les types partages cote web sont dans `src/types/domain.ts`. Les appels reseau passent par `src/lib/api.ts`, qui applique timeout, token et gestion d'erreur standard.

## Erreurs et validation

L'API utilise `express-async-handler` et un middleware central `errorHandler`. Les services creent des erreurs avec `statusCode` quand l'erreur doit etre exposee en HTTP. Les erreurs Spoonacular sont classees par raison (`quota_exceeded`, `invalid_key`, `network_error`, etc.) afin de permettre un fallback Mealizy.

## Stabilite RC1

Les changements structurels doivent rester limites avant la prochaine epic. Les zones a maintenir stables sont les schemas Mongoose, les contrats API documentes, les identifiants de categories/unites et la forme enrichie des ingredients de recette.

