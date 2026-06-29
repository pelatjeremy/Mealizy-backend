# Phase Beta 1 - Audit de stabilisation Mealizy

Date d'audit: 2026-06-29  
Branche auditee: `codex/sprint-2-meal-plans`  
Objectif: preparer une beta utilisateur stable sans ajouter de fonctionnalite et sans supprimer de code avant validation.

## Synthese executif

Mealizy est dans un etat favorable pour une beta controlee: le monorepo est lisible, les domaines metier principaux existent, les tests backend passent et le build frontend production compile. Les risques prioritaires ne sont pas des pannes evidentes, mais des sujets de stabilisation: validation d'entrees trop permissive sur certains endpoints, routes et concepts de listes de courses doublonnes, stockage du JWT en `localStorage`, documentation a rafraichir, et quelques chemins backend potentiellement couteux lorsque le catalogue grossira.

Verification effectuee:

- `corepack yarn lint`: OK.
- `corepack yarn workspace @mealizy/api test`: OK, 69 tests passes.
- `corepack yarn build`: OK, build API + Next.js production OK.
- Aucun nettoyage Git, aucune suppression de code, aucune migration de donnees executee.

Priorite recommandee avant beta:

1. Bloquer les risques de securite et de validation: whitelists d'update, validation stricte des payloads, secret JWT obligatoire en production.
2. Clarifier les listes de courses: distinguer clairement liste hebdomadaire et listes depuis recettes, ou converger l'API/UX.
3. Rafraichir la documentation: certaines sections indiquent encore des restes a finaliser deja partiellement faits.
4. Ajouter un jeu de tests beta manuel et quelques tests d'integration sur les flux critiques.
5. Nettoyer Git seulement apres validation humaine des branches et worktrees.

## 1. Rapport d'audit technique

### Points solides

- Structure monorepo claire: `apps/api` pour Express/Mongoose, `apps/web` pour Next.js.
- Tests backend riches pour normalisation, scoring, planning, shopping list, Spoonacular et auth.
- Build production valide.
- Mongoose contient deja plusieurs index utiles: inventaire par utilisateur/ingredient, recettes par source, planning par utilisateur/semaine/date, shopping list par semaine.
- Les routes sensibles principales utilisent `requireAuth` sur inventaire, planning, listes de courses et catalogue en ecriture.

### Code mort ou candidats a validation

- `apps/api/src/services/recipeService.js:148` contient `readImportedSpoonacularMap`, fonction non appelee dans l'etat actuel. Elle semble etre un vestige d'un catalogue mixte Spoonacular/imports. A valider avant suppression.
- `apps/web/src/app/page.tsx:1` retourne `null`. Ce n'est pas un bug grace a `AuthGate`, mais c'est une route racine vide; documenter le choix ou rediriger explicitement apres validation.
- `apps/web/src/app/profile/page.tsx:6` et `apps/web/src/app/settings/page.tsx:3` sont essentiellement statiques/non persistes. Ils ne sont pas du code mort, mais peuvent creer une attente UX trompeuse en beta.
- Les fichiers racine `mealizy-backend.err.log`, `mealizy-backend.out.log`, `mealizy-suggestions-page.png`, `backup-worktree-before-cleanup-20260617-084216.patch` doivent etre classes: conserver si utiles comme artefacts, sinon proposer suppression apres validation.

### Duplications ou chevauchements

- Deux surfaces API pour les listes: `/api/shopping-list` et `/api/shopping-lists` dans `apps/api/src/app.js:54-55`.
- Deux modelisations d'etat de coche coexistent: `checked` et `isChecked` dans `apps/api/src/models/ShoppingList.js:23-24`.
- Le frontend expose aussi deux entrees proches: "Liste de courses" et "Listes intelligentes" dans `apps/web/src/components/layout/AppShell.tsx:29-30`.
- Les comparaisons d'unites sont presentes dans plusieurs services (`recipeInventoryMatcher`, `shoppingListService`, `unitConversion`). Cela marche aujourd'hui, mais augmente le risque de divergence.

### Validation et robustesse

- `register` propage `...req.body` dans `User.create` avant champs normalises dans `apps/api/src/controllers/authController.js:32-37`. Mongoose ignore les champs hors schema par defaut, mais une whitelist explicite serait plus saine.
- `updateInventoryItem` construit `const update = { ...req.body }` dans `apps/api/src/controllers/inventoryController.js:34`. Risque de modification de champs non prevus si le schema evolue.
- `updateShoppingList` passe `req.body` directement a `findOneAndUpdate` dans `apps/api/src/controllers/shoppingListController.js:42-44`. C'est le point de validation le plus prioritaire.
- La suppression inventaire `deleteInventoryItem` renvoie toujours `204`, meme si l'item n'existe pas (`apps/api/src/controllers/inventoryController.js:57`). C'est acceptable idempotent, mais a documenter/tester.

### Dependances

- Aucune dependance manifestement inutile identifiee avec certitude.
- `recharts` est utilise via `NutritionPanel`, donc a conserver.
- `morgan` est utile en dev, mais devrait etre conditionne ou configure en production.

## 2. Rapport d'architecture

### Etat actuel

- Separation globale correcte:
  - routes: declaration HTTP;
  - controllers: adaptation req/res;
  - services: logique metier;
  - models: schemas Mongo;
  - utils/data: normalisation et catalogues statiques.
- Le domaine recette/inventaire/scoring est plutot bien isole dans des services testables.
- Le frontend centralise les appels API dans `apps/web/src/lib/api.ts`, ce qui facilite la stabilisation.

### Dette architecturelle prioritaire

- `shoppingListService.js` est trop large: generation depuis planning, generation depuis recettes, mutation inventaire, coche, suppression, serialisation. A terme, separer en:
  - `shoppingListGenerationService`;
  - `shoppingListInventorySyncService`;
  - `shoppingListRepository` ou helpers de persistence.
- `mealPlanService.js:328` fait un import dynamique de `shoppingListService` pour eviter un cycle. C'est pragmatique, mais signale un couplage entre planning et liste de courses.
- Les endpoints catalogue permettent a tout utilisateur authentifie de creer/mettre a jour/fusionner/desactiver des ingredients (`apps/api/src/routes/catalogRoutes.js:23-26`). Il manque une notion d'admin ou de moderation.
- Le modele `MealPlan` conserve a la fois `mealDate`, `weekStartDate` et `day`; c'est utile pour compatibilite legacy, mais doit etre documente pour eviter les regressions.

### Conventions

- Conventions de noms globalement coherentes.
- Certains libelles et textes frontend sont sans accents dans le code, probablement pour eviter l'encodage; continuer de maniere coherente ou normaliser tout en UTF-8.
- Les erreurs backend melangent anglais et francais. Pour beta FR, definir une convention: messages API techniques en anglais avec code, messages UI en francais; ou messages API utilisateurs en francais.

## 3. Rapport de securite

### Critique / elevee

- `JWT_SECRET` a une valeur fallback `dev-only-change-me` dans `apps/api/src/config/env.js:13`. En production, le serveur doit refuser de demarrer si `NODE_ENV=production` et que le secret est absent/faible.
- Le token est stocke en `localStorage` dans `apps/web/src/lib/api.ts:133-141`. Risque XSS. Pour beta privee, acceptable avec prudence; pour production, preferer cookies `HttpOnly`, `Secure`, `SameSite`.
- Les mises a jour directes depuis `req.body` doivent etre whitelistees, surtout `shoppingListController.updateShoppingList` (`apps/api/src/controllers/shoppingListController.js:42-44`) et `inventoryController.updateInventoryItem` (`apps/api/src/controllers/inventoryController.js:34`).

### Moyenne

- Pas de rate limiting sur login/register/import. Ajouter une protection minimale avant exposition publique.
- Pas de validation formelle type Zod/Joi/Valibot. Les validations existent mais sont dispersees.
- CORS autorise automatiquement des previews Vercel dont le hostname commence par `mealizy-frontend` (`apps/api/src/app.js:23-31`). C'est pratique, mais a restreindre avant production.
- `morgan("dev")` actif sans condition (`apps/api/src/app.js:42`). Reduire le niveau de logs en production.
- Les routes catalogue en ecriture demandent auth mais pas role admin.

### Basse

- `errorHandler` masque la stack en production (`apps/api/src/middlewares/errorMiddleware.js:11`), bon point.
- `helmet()` est actif (`apps/api/src/app.js:17`), bon point.
- `express.json({ limit: "1mb" })` limite les payloads, bon point.

## 4. Rapport de performances

### Risques backend

- Recherche recette par regex non ancree sur titre: `apps/api/src/services/recipeService.js:25-26`. L'index texte existe, envisager `$text` ou recherche prefixee si le catalogue grossit.
- Filtre `maxIngredients` utilise `$expr` + `$size` (`apps/api/src/services/recipeService.js:71`), potentiellement couteux. Ajouter un champ denormalise `ingredientCount`.
- Recherche ingredients avec plusieurs `$regex` sur tableaux/textes (`apps/api/src/services/ingredientService.js:52-58`). Acceptable petit catalogue; pour production, preferer index texte ou autocomplete dedie.
- `getPlannedNeeds` resout potentiellement les recettes une par une (`apps/api/src/services/shoppingListService.js:254`), et `generateShoppingListFromWeeklyMealPlan` aussi (`apps/api/src/services/mealPlanService.js:314`). Optimiser par batch si les semaines contiennent beaucoup de repas ou si les snapshots manquent.
- Dashboard frontend lance inventaire, planning, shopping list et suggestions en parallele (`apps/web/src/components/dashboard/DashboardClient.tsx:38-42`). UX rapide mais couteux; les suggestions recalculent l'inventaire et plusieurs catalogues.

### Optimisations proposees sans changement fonctionnel

- Ajouter `ingredientCount` sur `Recipe` au moment de la creation/import/migration.
- Centraliser la lecture inventaire pour scoring/suggestions quand plusieurs scores sont calcules dans une meme requete.
- Remplacer les backfills opportunistes de `normalizedName` en lecture inventaire par une migration dediee apres validation (`apps/api/src/controllers/inventoryController.js:6-16`).
- Introduire une pagination ou limite explicite sur `ShoppingList.find({ userId })` (`apps/api/src/controllers/shoppingListController.js:32`) avant que les historiques grossissent.
- Mesurer Lighthouse apres deploiement preview; le bundle `/dashboard` est le plus lourd du build (environ 201 kB first load JS).

## 5. Rapport UX

### Incoherences prioritaires

- Deux destinations de courses tres proches: "Liste de courses" hebdomadaire et "Listes intelligentes". Risque de confusion beta.
- `Profil` et `Parametres` affichent des champs qui ne semblent pas persister (`apps/web/src/app/profile/page.tsx:10-17`, `apps/web/src/app/settings/page.tsx:7-8`).
- `Dashboard` affiche "Calories moyenne" avec valeur fixe `0` (`apps/web/src/components/dashboard/DashboardClient.tsx:89`). Peut donner une impression de fonctionnalite cassee.
- Page racine vide (`apps/web/src/app/page.tsx:1-2`) pendant les redirections: risque de flash blanc.
- Plusieurs erreurs UI affichent un message generique sans action utilisateur precise.

### Parcours a clarifier pour beta

- Depuis une suggestion, l'utilisateur peut planifier, creer une liste, puis aller vers une liste intelligente. Depuis planning, il peut generer une liste de semaine. Le vocabulaire doit expliquer la difference.
- Les imports Spoonacular dependront de donnees pre-synchronisees ou de cle API; prevoir message clair en cas de quota/cle absente.
- Inventaire: le bouton "Ajouter un produit" existe sur la page inventaire, mais la page reutilise surtout `InventoryPreview`; verifier si le CRUD complet est expose dans l'UI finale.

### Responsive / accessibilite

- Build OK, mais validation visuelle non faite dans cet audit. A faire avec Lighthouse et test manuel mobile.
- Les modales ont `role="dialog"` sur certains flux, bon point; ajouter focus trap/retour focus pour production.
- Les images recettes ont souvent `alt=""`; acceptable decoratif, mais les cartes recette gagneraient a avoir un alt descriptif ou un `aria-label` sur le lien.

## 6. Plan de nettoyage Git

Etat observe:

- Branche courante: `codex/sprint-2-meal-plans`, en avance de 2 commits sur `origin/codex/planning-date-fix`.
- Changements locaux non commits: `apps/web/src/app/globals.css`, `apps/web/src/components/dashboard/MealPlanner.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/types/domain.ts`.
- Remotes:
  - `origin`: `Mealizy-backend.git`
  - `frontend`: `Mealizy-frontend.git`
- Worktrees:
  - racine active;
  - `.backend-main-verify` en detached HEAD;
  - `.codex-push-frontend-portions` marque `prunable`.
- Tags existants: `v0.2.0`, `v0.1.2-recipe-sync`, `v0.1.0-rc1`, `v0.1.0-mvp`, `v0.1.0-beta`.

Branches locales candidates a revue avant suppression:

- `codex/api-finalize-recipes-shopping`
- `codex/web-finalize-recipes-shopping`
- `codex/backend-main-reapply`
- `codex/frontend-main-reapply`

Commandes recommandees, a executer seulement apres validation:

```bash
git status --short --branch
git branch -vv
git branch --merged
git branch --no-merged
git worktree list
git worktree prune --dry-run
git fetch --all --prune
```

Apres validation explicite:

```bash
git worktree prune
git branch -d <branche-locale-validee-comme-fusionnee>
git branch -D <branche-locale-validee-comme-obsolete-non-fusionnee>
git push origin --delete <branche-distante-obsolete>
git push frontend --delete <branche-distante-obsolete>
```

Strategie de fusion vers `main`:

1. Stabiliser les changements locaux ou les isoler dans une branche beta.
2. Verifier quel repo est source de verite pour le monorepo, car `origin` et `frontend` pointent vers deux depots separes.
3. Creer une branche `release/beta-1` ou `codex/beta-1-stabilization`.
4. Merger uniquement les branches validees et testees.
5. Taguer apres build et smoke test: `v0.3.0-beta.1` ou schema choisi.

## 7. Plan de tests beta

### Pre-requis testeur

- Environnement de test deploye.
- Compte test dedie.
- Base Mongo de test separee de la production.
- Jeu de recettes de demo/synchronisees disponible.
- Navigateur desktop et mobile.

### Authentification

- [ ] Inscription avec prenom, nom, email, mot de passe valide.
- [ ] Inscription avec email deja utilise: message comprehensible.
- [ ] Inscription avec mot de passe trop court: blocage.
- [ ] Connexion avec identifiants valides.
- [ ] Connexion avec mauvais mot de passe.
- [ ] Deconnexion depuis la sidebar.
- [ ] Acces a une route privee sans token: redirection login.
- [ ] Token expire/invalide: session nettoyee et redirection login.

### Inventaire

- [ ] Voir inventaire vide.
- [ ] Ajouter un ingredient avec quantite, unite, categorie, date.
- [ ] Modifier quantite/unite/date.
- [ ] Modifier le nom d'un ingredient.
- [ ] Supprimer un item.
- [ ] Chercher/filtrer si l'UI finale le propose.
- [ ] Verifier les produits proches peremption.
- [ ] Tester unite invalide et quantite negative.

### Recettes

- [ ] Rechercher une recette.
- [ ] Filtrer par categorie.
- [ ] Filtrer par calories/proteines/temps/nombre d'ingredients.
- [ ] Voir detail recette.
- [ ] Creer recette personnelle.
- [ ] Modifier recette personnelle.
- [ ] Tenter modifier recette non personnelle: refus.
- [ ] Importer ou synchroniser une recette Spoonacular si cle disponible.
- [ ] Cas API Spoonacular absente, invalide, quota depasse.

### Suggestions

- [ ] Inventaire vide: suggestions sans crash.
- [ ] Inventaire complet pour une recette: score `Pret a cuisiner`.
- [ ] Inventaire partiel: ingredients manquants et partiels coherents.
- [ ] Filtres `score min`, `manquants max`, categorie, pret uniquement.
- [ ] Selectionner plusieurs suggestions et creer une liste.
- [ ] Planifier une suggestion.

### Planning

- [ ] Ajouter un repas a une date.
- [ ] Modifier portions.
- [ ] Deplacer un repas si l'UI le permet.
- [ ] Supprimer un repas.
- [ ] Naviguer semaine precedente/suivante.
- [ ] Generer une liste depuis une semaine planifiee.
- [ ] Generer liste avec semaine vide: message clair.
- [ ] Recette supprimee ou introuvable dans un plan: comportement stable.

### Liste de courses hebdomadaire

- [ ] Generer depuis planning.
- [ ] Regenerer et conserver/gerer les coches existantes.
- [ ] Cocher un article: ajout inventaire.
- [ ] Decocher un article: retrait inventaire.
- [ ] Valider les achats coches.
- [ ] Semaine sans besoins: message "aucune course necessaire".
- [ ] Unites incompatibles: lignes separees.

### Listes intelligentes depuis recettes

- [ ] Creer depuis une recette.
- [ ] Creer depuis plusieurs recettes.
- [ ] Fusion des ingredients identiques.
- [ ] Cocher/decocher un item.
- [ ] Supprimer une liste.
- [ ] Ouvrir une liste via parametre `?id=`.

### Cas limites

- [ ] Inventaire vide.
- [ ] Recette sans ingredient.
- [ ] Ingredient inconnu.
- [ ] Unite incompatible.
- [ ] Recettes dupliquees.
- [ ] Connexion interrompue pendant generation.
- [ ] Erreur backend 500 simulee.
- [ ] Quota Spoonacular depasse.
- [ ] Mobile petit ecran.
- [ ] Rafraichissement navigateur au milieu d'un flux.

## 8. Checklist de mise en production beta

### Configuration

- [ ] `MONGODB_URI` pointe vers une base beta sauvegardee.
- [ ] `JWT_SECRET` long, aleatoire, absent du depot.
- [ ] `JWT_EXPIRES_IN` choisi et documente.
- [ ] `CORS_ORIGIN` limite aux URLs frontend beta.
- [ ] `NEXT_PUBLIC_API_URL` pointe vers le backend beta.
- [ ] `SPOONACULAR_API_KEY` configuree ou experience sans Spoonacular documentee.

### Donnees

- [ ] Backup Mongo avant migration ou seed.
- [ ] Jeu de recettes demo valide.
- [ ] Catalogue ingredients synchronise ou seed stable.
- [ ] Migration ingredients executee en dry-run puis validee si necessaire.

### Qualite

- [ ] `corepack yarn lint` OK.
- [ ] `corepack yarn workspace @mealizy/api test` OK.
- [ ] `corepack yarn build` OK.
- [ ] Smoke test auth + dashboard + inventaire + recettes + planning + courses.
- [ ] Lighthouse sur pages principales.
- [ ] Test mobile.

### Observabilite

- [ ] Logs backend consultables.
- [ ] Erreurs 4xx/5xx surveillees.
- [ ] Health check `/api/health` surveille.
- [ ] Quotas Spoonacular suivis.
- [ ] Procedure rollback documentee.

### UX / contenu

- [ ] Favicon et metadata valides.
- [ ] Page 404 acceptable.
- [ ] Erreurs utilisateur comprehensibles.
- [ ] Difference entre liste hebdomadaire et listes intelligentes clarifiee.
- [ ] Profil/parametres soit persistants, soit caches/indiques comme non actifs.

### Git / release

- [ ] Worktree propre ou changements intentionnellement commits.
- [ ] Branches obsoletes validees avant suppression.
- [ ] Tag beta cree apres validation.
- [ ] Notes de release beta redigees.

## Documentation a mettre a jour

- `README.md`: retirer ou actualiser "Restant a finaliser" car plusieurs elements sont deja implementes/testes.
- `apps/api/README.md`: ajouter routes catalogue, recettes personnalisees, import/sync Spoonacular, routes shopping-lists.
- `apps/web/README.md`: documenter `NEXT_PUBLIC_API_URL`, build, pages et limites beta.
- Ajouter une page `docs/architecture.md` racine qui explique le monorepo et les conventions.
- Ajouter une page `docs/runbook-beta.md` pour deploiement, smoke test et rollback.

## Decisions recommandees avant toute suppression

- Valider si `readImportedSpoonacularMap` doit etre conserve pour un futur flux d'import status.
- Decider du vocabulaire et du contrat API cible pour les deux types de listes de courses.
- Decider si les pages Profil/Parametres restent dans la beta si elles ne persistent pas.
- Decider quel remote est la source de verite du monorepo avant nettoyage Git.

## Mise a jour Beta 1.1

Decisions appliquees:

- Le secret JWT n'a plus de fallback faible en production. `JWT_SECRET` est obligatoire avec `NODE_ENV=production`.
- Les updates critiques doivent passer par des whitelists de champs autorises.
- Le double concept de listes est conserve pour eviter une refonte: "Courses semaine" pour le planning, "Courses recettes" pour les listes ponctuelles depuis recettes.
- La page Profil doit permettre une edition minimale des preferences existantes; la page Parametres doit afficher la configuration beta sans formulaire factice.
