# Process de tri des retours beta Mealizy

Ce document sert a classer les retours beta et a decider rapidement quoi corriger, reporter, supprimer ou ignorer.

## Categories

### Bug bloquant

Un utilisateur ne peut pas terminer un parcours essentiel.

Exemples:

- impossible de se connecter;
- impossible de charger le dashboard;
- impossible de generer une liste de courses;
- perte visible de donnees;
- page totalement bloquee.

Decision par defaut: corriger immediatement.

### Bug genant

Le parcours reste possible, mais l'experience est degradee.

Exemples:

- message d'erreur peu clair;
- mauvais etat visuel apres une action;
- besoin de rafraichir pour voir une mise a jour;
- lenteur importante mais ponctuelle.

Decision par defaut: corriger pendant la beta si le probleme touche plusieurs testeurs.

### Bug mineur

Probleme visible mais facile a contourner.

Exemples:

- faute de texte;
- alignement imparfait;
- libelle peu precis;
- petit souci responsive non bloquant.

Decision par defaut: reporter, sauf correction tres rapide.

### Amelioration UX

Le fonctionnement est correct, mais pourrait etre plus clair ou plus simple.

Exemples:

- renommer un bouton;
- ajouter une indication;
- simplifier un parcours;
- ameliorer un etat vide.

Decision par defaut: prioriser si cela reduit la confusion sur un parcours essentiel.

### Fonctionnalite inutile

Une fonctionnalite existe mais les testeurs ne la comprennent pas ou ne l'utilisent pas.

Exemples:

- page peu consultee;
- action rarement utile;
- information affichee sans decision utilisateur.

Decision par defaut: simplifier, cacher ou supprimer apres validation produit.

### Fonctionnalite manquante

Un besoin revient souvent mais n'est pas encore couvert.

Exemples:

- scanner un produit;
- partager un planning;
- modifier plus finement une recette;
- choisir un regime alimentaire avance.

Decision par defaut: reporter hors beta sauf si le manque bloque un parcours essentiel.

### Dette technique

Probleme invisible ou peu visible pour le testeur, mais risqué pour la stabilite.

Exemples:

- validation insuffisante;
- requete lente;
- logs incomplets;
- duplication de logique.

Decision par defaut: traiter si cela reduit un risque beta, sinon planifier apres beta.

## Priorite

Utiliser quatre niveaux:

- P0: bloque la beta ou expose un risque donnees/securite.
- P1: gene un parcours essentiel pour plusieurs utilisateurs.
- P2: gene ponctuellement ou degrade la clarte.
- P3: amelioration ou confort.

## Regles de decision

### Corriger immediatement

Corriger tout retour qui remplit au moins une condition:

- P0;
- bug bloquant;
- risque de perte de donnees;
- probleme de securite;
- meme bug signale par plusieurs testeurs sur un parcours essentiel.

### Reporter

Reporter si:

- le probleme ne bloque pas le test;
- la correction demande un refactoring important;
- la fonctionnalite est utile mais non essentielle pour la beta;
- le retour concerne une future extension produit.

### Supprimer ou cacher

Supprimer ou cacher si:

- la fonctionnalite donne une impression d'application incomplete;
- les testeurs ne comprennent pas son utilite;
- elle cree plus de confusion que de valeur;
- elle n'est pas necessaire au scenario beta.

### Ignorer

Ignorer seulement si:

- le retour est isole et non reproductible;
- le comportement est volontaire et documente;
- le cout de correction est disproportionne pour la beta;
- le retour contredit l'objectif produit valide.

## Format recommande pour chaque retour

- Identifiant:
- Date:
- Testeur:
- Categorie:
- Priorite:
- Page:
- Resume:
- Reproduction:
- Decision:
- Responsable:
- Statut:

## Rythme de tri

- Pendant la beta: tri rapide tous les 1 a 2 jours.
- Apres la beta: session de synthese avec tous les retours.
- Avant correction: regrouper les doublons.
- Apres correction: verifier avec le scenario utilisateur original.
