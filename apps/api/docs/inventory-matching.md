# Matching Inventaire Recettes

## Objectif

Le matching inventaire / recette indique si une recette est realisable avec le stock utilisateur. Il ne modifie ni l'inventaire ni la recette.

## Entrees

`recipeInventoryMatcher.js` compare :

- une recette avec `ingredients` enrichis ;
- les `InventoryItem` de l'utilisateur, peuples avec leur `Ingredient`.

Les correspondances sont cherchees d'abord par `ingredientId`, puis par `normalizedName`.

## Quantites

Les unites comparables sont regroupees par familles :

- masse : `mg`, `g`, `kg` ;
- volume : `ml`, `cl`, `l`, `cup`, `tbsp`, `tsp` ;
- unite : `unit`, `slice`, `can`, `jar`.

Quand deux unites ne sont pas comparables, l'ingredient est considere disponible si le nom matche, mais `quantityComparable` vaut `false`.

## Sortie

Le resultat contient :

- `compatibilityScore` de 0 a 100 ;
- compteurs disponibles, partiels et manquants ;
- listes `matched`, `partial`, `missing` avec quantites requises, disponibles et manquantes.

Les ingredients partiels comptent pour la moitie dans le score.

## Index utiles

`InventoryItem` expose des index par utilisateur et ingredient :

- `{ userId: 1, ingredientId: 1 }`
- `{ userId: 1, normalizedName: 1 }`

Ces index supportent la lecture d'inventaire utilisateur et les futures optimisations de matching.

