# Runbook beta Mealizy

Ce runbook decrit la preparation et la verification d'une version beta.

## Avant de deployer

1. Verifier l'etat Git.

```bash
git status --short --branch
git branch -vv
```

2. Installer les dependances.

```bash
corepack yarn install
```

3. Lancer les validations locales.

```bash
corepack yarn lint
corepack yarn workspace @mealizy/api test
corepack yarn build
```

4. Verifier les variables d'environnement.

- `MONGODB_URI`
- `JWT_SECRET` obligatoire en production, long et aleatoire
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `SPOONACULAR_API_KEY`
- `NEXT_PUBLIC_API_URL`

## Smoke test apres deploiement

- [ ] `GET /api/health` retourne `{ "status": "ok" }`.
- [ ] Inscription utilisateur test.
- [ ] Connexion utilisateur test.
- [ ] Dashboard charge sans erreur.
- [ ] Inventaire vide puis ajout d'un produit.
- [ ] Catalogue recettes charge.
- [ ] Detail recette charge.
- [ ] Suggestions chargees avec inventaire vide.
- [ ] Ajout d'un repas au planning.
- [ ] Generation liste de courses depuis planning.
- [ ] Coche d'un article et verification inventaire.
- [ ] Creation liste intelligente depuis une suggestion.
- [ ] Navigation claire entre "Courses semaine" et "Courses recettes".
- [ ] Deconnexion puis redirection login.

## Surveillance beta

- Surveiller les erreurs 401/403 anormales.
- Surveiller les erreurs 500.
- Surveiller les quotas Spoonacular.
- Surveiller les temps de reponse des endpoints:
  - `/api/recipes/catalog`
  - `/api/recipes/suggestions`
  - `/api/meal-plans`
  - `/api/shopping-list/generate`
- Collecter les retours UX sur:
  - difference entre les deux listes de courses;
  - comprehension des scores;
  - creation/modification de recettes;
  - planning hebdomadaire mobile.

## Rollback

1. Identifier le dernier tag stable.
2. Restaurer les variables d'environnement si elles ont change.
3. Redeployer la version precedente.
4. Ne pas executer de migration destructive sans backup.

## Nettoyage apres beta

- Consolider les retours testeurs.
- Transformer les bugs en tickets priorises.
- Nettoyer les branches seulement apres validation.
- Creer un tag de beta validee.
