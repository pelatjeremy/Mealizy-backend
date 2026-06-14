# Mealizy

Mealizy est une application web fullstack pour gérer un inventaire alimentaire, planifier les repas de la semaine, suggérer des recettes selon les ingrédients disponibles et générer une liste de courses automatique.

## Stack

- Frontend : Next.js, React, TypeScript
- Backend : Node.js, Express
- Base de données : MongoDB avec Mongoose
- Authentification : JWT
- Mots de passe : bcrypt
- Gestion du projet : Yarn workspaces

## Architecture

```text
.
├── apps
│   ├── api
│   │   └── src
│   │       ├── config
│   │       ├── controllers
│   │       ├── data
│   │       ├── middlewares
│   │       ├── models
│   │       ├── routes
│   │       ├── services
│   │       └── utils
│   └── web
│       └── src
│           ├── app
│           ├── components
│           ├── lib
│           └── types
├── .env.example
├── package.json
└── README.md
```

## Installation

```bash
yarn install
```

Copier `.env.example` en `.env` à la racine ou dans les apps selon votre stratégie de déploiement.

## Variables d'environnement

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/mealizy
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:3000
SPOONACULAR_API_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

`SPOONACULAR_API_KEY` est optionnelle pour cette première version. L'app embarque des recettes de démonstration si l'API externe n'est pas configurée.

## Lancement

Lancer tout le projet :

```bash
yarn dev
```

Lancer seulement l'API :

```bash
yarn dev:api
```

Lancer seulement le frontend :

```bash
yarn dev:web
```

URLs par défaut :

- Frontend : http://localhost:3000
- Backend : http://localhost:4000/api
- Santé API : http://localhost:4000/api/health

## Fonctionnalités créées

- Authentification : inscription, connexion, JWT, hash bcrypt
- Profil utilisateur : foyer, types de repas, équipements, préférences et allergies
- Inventaire : CRUD, catégories, unités, dates de péremption, alerte produits proches expiration
- Recettes : recherche, recettes demo, modèle prêt pour recettes personnalisées
- Suggestions : classement par nombre d'ingrédients manquants avec normalisation simple
- Planning repas : création, modification et suppression de créneaux hebdomadaires
- Liste de courses : génération depuis le planning moins l'inventaire, ajout des achats cochés à l'inventaire
- Tableau de bord : stats, planning, inventaire, liste de courses, suggestions et nutrition
- Pages principales : accueil, connexion, inscription, dashboard, inventaire, recettes, planning, courses, mes recettes, profil, paramètres

## Routes API principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/inventory`
- `POST /api/inventory`
- `PUT /api/inventory/:id`
- `DELETE /api/inventory/:id`
- `GET /api/recipes/search`
- `GET /api/recipes/suggestions`
- `POST /api/meal-plans`
- `GET /api/meal-plans`
- `POST /api/shopping-list/generate`
- `GET /api/shopping-list`

## Restant à finaliser

- Brancher la vraie API Spoonacular et mapper toutes les valeurs nutritionnelles disponibles
- Ajouter les formulaires frontend complets pour les opérations CRUD
- Persister l'auth côté frontend avec stockage sécurisé du token et routes privées
- Ajouter les tests unitaires et d'intégration
- Ajouter le scan code-barres et le formulaire avancé de recettes personnalisées
