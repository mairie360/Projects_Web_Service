# Politique de tests frontend

Les assertions CI et packaging sont regroupées dans `tests/ci-policy.test.cjs` (MAIR-437). Les corps des anciens tests restent identiques : révisions des scanners examinées, contrôles bloquants, secrets nommés, permissions, approbation, installation et limites du runtime restent vérifiés. Sources produit, versions des dépendances, workflows et contrôles d’accessibilité restent inchangés.

Ce regroupement ne transforme pas un échec d’audit en réussite. Résultats locaux et CI, intégration et preuves de livraison restent distincts. Un test qui lit une configuration vérifie une politique ; il ne prouve pas le rendu du produit.
