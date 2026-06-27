# Mealizy v0.1.0 - MVP

Mealizy est une application de planification alimentaire qui aide un foyer a passer de son inventaire reel a des repas planifies, puis a une liste de courses exploitable. Cette version MVP pose une base stable pour tester le parcours complet : compte utilisateur, inventaire, recettes, planning, courses et suivi depuis le dashboard.

## Vision

Mealizy vise a simplifier l'organisation des repas en reliant trois questions du quotidien : ce que l'utilisateur possede deja, ce qu'il veut cuisiner, et ce qu'il doit acheter. Le produit doit progressivement devenir un assistant alimentaire personnel, capable de reduire la charge mentale, le gaspillage et les achats inutiles.

## Fonctionnalites disponibles

* Authentification et profil utilisateur.
* Inventaire personnel.
* Catalogue de recettes Mealizy.
* Recherche de recettes Spoonacular avec fallback propre.
* Creation et modification de recettes personnelles.
* Recherche et suggestions de recettes basees sur l'inventaire.
* Planning repas hebdomadaire.
* Mode cuisine via le detail de recette depuis le planning.
* Generation de liste de courses depuis le planning.
* Synchronisation entre liste de courses et inventaire.
* Validation des achats.
* Dashboard de synthese.
* Interface responsive de base.
* Deploiement production Vercel.

## Technologies utilisees

* Backend Node.js et Express.
* MongoDB avec Mongoose.
* Authentification JWT.
* API Spoonacular pour les recettes externes.
* Frontend Next.js avec React et TypeScript.
* Vercel pour les deploiements backend et frontend.

## Architecture

Le backend expose une API REST structuree autour des utilisateurs, inventaires, recettes, plannings repas et listes de courses. Les donnees utilisateur sont isolees par `userId`. Les recettes publiques Mealizy et les recettes externes Spoonacular alimentent le catalogue, tandis que les recettes personnelles restent rattachees a leur proprietaire.

Le frontend consomme l'API via une couche client centralisee. Les pages principales couvrent le dashboard, l'inventaire, les recettes, les suggestions, le planning et la liste de courses. Le parcours MVP est concu pour etre testable de bout en bout en production.

## Prochaines evolutions

* Scanner de code-barres pour accelerer l'ajout a l'inventaire.
* Gestion des dates de peremption.
* Notifications et rappels.
* Assistant IA Mealizy pour recommandations plus personnalisees.
* Amelioration de la nutrition et des preferences alimentaires.
* Optimisation mobile avancee.
