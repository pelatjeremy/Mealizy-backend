# Beta data operations

## Nettoyer les donnees demo/test

Toujours commencer par un dry-run.

```bash
corepack yarn workspace @mealizy/api cleanup:beta-data --dry-run
```

Le dry-run liste les recettes et ingredients candidats sans supprimer de compte utilisateur.

Apres verification humaine des echantillons:

```bash
corepack yarn workspace @mealizy/api cleanup:beta-data --execute
```

La commande cible uniquement:

- recettes `source=demo` ou `sourceProvider=demo`;
- recettes avec `externalId` commencant par `demo-`;
- recettes creees par `demo@mealizy.app`;
- titres de test explicites comme `Dashboard ...`, `Demo ...`, `Seed ...`, `Test ...`, ou titres contenant un identifiant technique long;
- ingredients explicitement marques `test`, `dev` ou `demo`.

Elle ne supprime jamais les vrais comptes utilisateurs.

## Importer de vraies recettes

Synchroniser un lot Spoonacular:

```bash
corepack yarn workspace @mealizy/api sync:recipes --query=pasta --limit=20
```

Avec categorie:

```bash
corepack yarn workspace @mealizy/api sync:recipes --query=pasta --category=main-course --limit=20
```

La synchronisation utilise l'upsert existant sur `sourceProvider=spoonacular` + `externalId`, evite les doublons d'un meme lot et normalise les ingredients via le catalogue `Ingredient`.

## Seeds demo

Ne pas lancer en production:

```bash
corepack yarn workspace @mealizy/api seed:demo-recipes
```

Ce seed est reserve au developpement local ou aux demos isolees. En beta controlee, privilegier `sync:recipes`.
