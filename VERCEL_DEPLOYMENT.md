# Deploiement Vercel

Le depot contient deux projets deployables separement :

- `apps/web` : frontend Next.js
- `apps/api` : backend Express expose en Vercel Function

## Variables Vercel

Backend `apps/api` :

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://mealizy-frontend-4tjv1c51e-pelatjeremys-projects.vercel.app,https://mealizy-frontend.vercel.app
SPOONACULAR_API_KEY=<optional>
```

Frontend `apps/web` :

```env
NEXT_PUBLIC_API_URL=https://mealizy-backend.vercel.app/api
```

`NEXT_PUBLIC_API_URL` est public cote navigateur. Ne jamais y mettre de secret.

## Deployer le backend

```bash
corepack enable
vercel link --cwd apps/api
vercel env add MONGODB_URI --cwd apps/api
vercel env add JWT_SECRET --cwd apps/api
vercel env add JWT_EXPIRES_IN --cwd apps/api
vercel env add CORS_ORIGIN --cwd apps/api
vercel env add SPOONACULAR_API_KEY --cwd apps/api
vercel deploy --prod --cwd apps/api
```

Apres ce deploiement, l'URL API a utiliser cote frontend est :

```env
NEXT_PUBLIC_API_URL=https://mealizy-backend.vercel.app/api
```

Exemple : si Vercel renvoie `https://mealizy-api.vercel.app`, mettre :

```env
NEXT_PUBLIC_API_URL=https://mealizy-api.vercel.app/api
```

## Deployer le frontend

Ajoute d'abord `NEXT_PUBLIC_API_URL` dans les variables du projet frontend, avec l'URL du backend terminee par `/api`.

```bash
corepack enable
vercel link --cwd apps/web
vercel env add NEXT_PUBLIC_API_URL --cwd apps/web
vercel deploy --prod --cwd apps/web
```

Une fois l'URL frontend connue, mets a jour `CORS_ORIGIN` dans le projet backend :

```bash
vercel env rm CORS_ORIGIN production --cwd apps/api
vercel env add CORS_ORIGIN production --cwd apps/api
vercel deploy --prod --cwd apps/api
```

Pour plusieurs origines, separe les URLs par des virgules :

```env
CORS_ORIGIN=https://mealizy-web.vercel.app,https://www.example.com
```
