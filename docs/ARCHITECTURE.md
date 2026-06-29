# Architecture Mealizy

Mealizy est un monorepo Yarn compose de deux applications:

- `apps/api`: API Express, MongoDB et logique metier.
- `apps/web`: frontend Next.js App Router.

## Backend

Structure principale:

- `src/app.js`: configuration Express, middlewares globaux, montage des routes.
- `src/server.js`: bootstrap serveur et connexion MongoDB.
- `src/config`: environnement et connexion base.
- `src/routes`: declaration des endpoints.
- `src/controllers`: adaptation HTTP, lecture `req`, reponse `res`.
- `src/services`: logique metier testable.
- `src/models`: schemas Mongoose et index.
- `src/utils`: normalisation et conversions reutilisables.
- `src/data`: catalogues statiques.
- `tests`: tests Node natifs.

Convention cible:

- Les controllers doivent rester fins.
- Les payloads entrants doivent etre whitelistes avant update Mongo.
- Les services ne doivent pas exposer de details HTTP.
- Les modeles declarent les validations persistantes et les index.
- Les erreurs metier portent un `statusCode`.

## Frontend

Structure principale:

- `src/app`: routes Next.js.
- `src/components`: composants UI et metier.
- `src/lib/api.ts`: client HTTP unique vers l'API.
- `src/types/domain.ts`: types partages cote frontend.

Convention cible:

- Les appels API passent par `src/lib/api.ts`.
- Les pages gerent le chargement, les erreurs et les etats vides.
- Les composants complexes restent decoupes par domaine (`dashboard`, `shopping`, `recipes`).
- Les routes privees sont protegees par `AuthGate`.

## Domaines metier

- Authentification: `authRoutes`, `authController`, `User`, `tokenService`.
- Inventaire: `inventoryRoutes`, `inventoryController`, `InventoryItem`, `ingredientService`.
- Recettes: `recipeRoutes`, `recipeController`, `Recipe`, `recipeService`.
- Catalogue ingredients: `catalogRoutes`, `Ingredient`, `ingredientService`.
- Normalisation/comparaison: `ingredientNormalizer`, `ingredientMatcher`, `recipeInventoryMatcher`.
- Scoring/suggestions: `recipeScoreEngine`, `recipeSuggestionService`.
- Planning: `mealPlanRoutes`, `MealPlan`, `mealPlanService`.
- Courses: `shoppingListRoutes`, `ShoppingList`, `shoppingListService`.

## Commandes utiles

```bash
corepack yarn install
corepack yarn dev
corepack yarn dev:api
corepack yarn dev:web
corepack yarn lint
corepack yarn workspace @mealizy/api test
corepack yarn build
```

## Variables d'environnement

Backend:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/mealizy
JWT_SECRET=replace-with-a-long-random-secret-32-bytes-minimum
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:3000
SPOONACULAR_API_KEY=
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Points d'attention beta

- Deux concepts de listes de courses coexistent et sont conserves pour la beta:
  - "Courses semaine" correspond a la liste hebdomadaire generee depuis le planning.
  - "Courses recettes" correspond aux listes ponctuelles generees depuis une ou plusieurs recettes.
- `mealDate` est la source moderne du planning; `weekStartDate` + `day` restent pour compatibilite.
- `JWT_SECRET` est obligatoire en production. Sans variable configuree, l'API doit refuser de demarrer.
- Le token frontend est stocke en `localStorage`; a remplacer par cookie securise avant production publique.
- Les routes catalogue en ecriture exigent auth mais pas role admin.
