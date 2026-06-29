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
- `POST /api/shopping-list/generate`
- `GET /api/shopping-list`
