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

## Before controlled beta launch

Cette checklist doit etre terminee avant d'envoyer le lien aux beta testeurs.

### Variables d'environnement

- [ ] `MONGODB_URI` pointe vers une base beta dediee.
- [ ] `JWT_SECRET` est configure en production, long, aleatoire et non partage.
- [ ] `JWT_EXPIRES_IN` est choisi et documente.
- [ ] `CORS_ORIGIN` contient uniquement les URLs frontend autorisees.
- [ ] `NEXT_PUBLIC_API_URL` pointe vers l'API beta.
- [ ] `SPOONACULAR_API_KEY` est configuree ou l'absence d'import externe est acceptee pour la beta.

### Base de donnees

- [ ] La base beta est separee de toute base personnelle ou production.
- [ ] Une sauvegarde initiale est disponible.
- [ ] Les donnees de test peuvent etre reinitialisees si besoin.
- [ ] Les migrations ou seeds ont ete testes hors donnees critiques.

### Compte test

- [ ] Un compte test interne existe.
- [ ] Le mot de passe du compte test est partage uniquement via un canal prive.
- [ ] Le compte test permet de verifier inventaire, recettes, planning et courses.
- [ ] Les beta testeurs peuvent aussi creer leur propre compte.

### Seed minimal

- [ ] Le dry-run de nettoyage beta a ete relu: `corepack yarn workspace @mealizy/api cleanup:beta-data --dry-run`.
- [ ] Les recettes de demonstration/test ont ete supprimees si necessaire avec `--execute`.
- [ ] Les recettes visibles en beta viennent de Spoonacular ou de vrais utilisateurs, pas de `seed:demo-recipes`.
- [ ] Quelques recettes synchronisees sont disponibles via `corepack yarn workspace @mealizy/api sync:recipes --query=pasta --limit=20`.
- [ ] Le catalogue d'ingredients contient les categories et unites principales.
- [ ] Le parcours fonctionne meme avec un inventaire vide.

### Sauvegarde

- [ ] Une sauvegarde Mongo est faite avant ouverture.
- [ ] La procedure de restauration est connue.
- [ ] Aucune commande destructive n'est prevue pendant la beta sans backup.

### Lien de l'application

- [ ] Le lien frontend beta est final.
- [ ] Le lien API n'est pas donne aux testeurs sauf besoin technique.
- [ ] Le lien a ete teste en navigation privee.
- [ ] Le lien fonctionne sur mobile.

### Rollback

- [ ] Le dernier commit ou tag stable est identifie.
- [ ] La commande ou procedure de redeploiement precedent est connue.
- [ ] Les variables d'environnement de la version precedente sont disponibles.

### Monitoring manuel

- [ ] Une personne verifie regulierement `/api/health`.
- [ ] Les erreurs signalees par les testeurs sont lues chaque jour.
- [ ] Les quotas Spoonacular sont surveilles si l'import externe est actif.
- [ ] Les problemes P0/P1 ont un canal d'alerte direct.

### Canal de retour

- [ ] Les testeurs savent ou envoyer les bugs.
- [ ] Le template bug est partage.
- [ ] Le questionnaire de retour est partage.
- [ ] Une date limite de retour est annoncee.

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
