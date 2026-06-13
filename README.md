# Mealizy Backend

API Express de Mealizy pour gérer l'authentification, l'inventaire alimentaire, les recettes, le planning repas et la liste de courses.

## Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcrypt
- Yarn

## Installation

```bash
yarn install
```

## Variables d'environnement

Créer un fichier `.env` :

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/mealizy
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:3000
SPOONACULAR_API_KEY=
```

## Lancement

```bash
yarn dev
```

API disponible sur http://localhost:4000/api.

MongoDB doit etre demarre et accessible via `MONGODB_URI`. Par defaut, l'API attend `mongodb://127.0.0.1:27017/mealizy`.

## Routes principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/inventory`
- `POST /api/inventory`
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

- Normalisation des ingredients : minuscules, accents, espaces, pluriels simples, `œ` vers `oe`.
- Suggestions groupees par nombre d'ingredients manquants.
- Filtrage des suggestions selon les equipements disponibles de l'utilisateur.
- Recherche Spoonacular si `SPOONACULAR_API_KEY` est configuree.
- Fallback vers des recettes locales de demonstration si Spoonacular est absent ou indisponible.
- Generation de liste de courses : besoins du planning moins inventaire disponible.
- Ajout des produits coches dans l'inventaire.
- Alerte inventaire pour les produits bientot perimes.
