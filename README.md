# Mealizy Backend

API Express de Mealizy pour gerer l'authentification, l'inventaire alimentaire, les recettes, le planning repas et la liste de courses.

## Stack

- Node.js
- Express
- MongoDB Atlas ou MongoDB local
- Mongoose
- JWT
- bcrypt
- Yarn

## Installation

```bash
yarn install
```

## Variables d'environnement

Creer un fichier `.env` local. Ne jamais committer ce fichier.

```bash
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:3000
SPOONACULAR_API_KEY=
```

L'API lit directement `process.env.MONGODB_URI`, `process.env.JWT_SECRET` et `process.env.SPOONACULAR_API_KEY` via `src/config/env.js`.

## Lancement

```bash
yarn dev
```

API disponible sur http://localhost:4000/api.

MongoDB doit etre accessible via `MONGODB_URI`. Spoonacular est utilise seulement si `SPOONACULAR_API_KEY` est presente. Sans cle Spoonacular, l'API utilise les recettes locales de demonstration.

## Routes principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/inventory`
- `POST /api/inventory`
- `PUT /api/inventory/:id`
- `DELETE /api/inventory/:id`
- `GET /api/inventory/expiring-soon`
- `GET /api/recipes/search`
- `GET /api/recipes/suggestions`
- `GET /api/meal-plans`
- `POST /api/meal-plans`
- `PUT /api/meal-plans/:id`
- `DELETE /api/meal-plans/:id`
- `POST /api/shopping-list/generate`
- `GET /api/shopping-list`
- `PUT /api/shopping-list/items/:id/check`

## Fonctionnalites metier disponibles

- Normalisation des ingredients : minuscules, accents, espaces, pluriels simples, `oe` coherent.
- Suggestions groupees par nombre d'ingredients manquants.
- Filtrage des suggestions selon les equipements disponibles de l'utilisateur.
- Recherche Spoonacular si la cle API est configuree.
- Fallback vers des recettes locales de demonstration si Spoonacular est absent ou indisponible.
- Generation de liste de courses : besoins du planning moins inventaire disponible.
- Ajout des produits coches dans l'inventaire.
- Alerte inventaire pour les produits bientot perimes.

## Securite

Les fichiers `.env`, `.env.local` et `.env.production` sont ignores par Git. Ne pas ecrire de cle API, mot de passe ou chaine de connexion dans le code, le README ou GitHub.
