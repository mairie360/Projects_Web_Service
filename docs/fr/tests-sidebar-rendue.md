# Styles appliqués à la navigation réellement rendue

Le test monte le véritable AppShell installé avec des destinations de test
explicites et applique la vraie feuille de styles Projects. Il vérifie la
position et la couche de la sidebar, son ombre de référence, la hauteur minimale
déclarée et le comportement de réduction des vrais boutons. Il ouvre ensuite le
tiroir partagé, vérifie la couche de sa sidebar et ferme le tiroir par sa vraie
commande. Les anciens tests de texte CSS/sidebar passent dans ces contrôles de
composant ; la typographie racine et les politiques globales parsées restent
dans la suite Node.

JSDOM ne compile pas Tailwind, n'applique pas les media queries responsive,
ne mesure pas la géométrie des lignes et ne réalise pas le hit-test du navigateur.
Les propriétés calculées prises en charge et l'interaction du vrai composant
constituent des contrôles partiels utiles. Les snapshots réels main restent à
vérifier sur mobile, tablette et ordinateur, dont le hit-test de Fermer. Aucun
style applicatif, paquet partagé, dépendance, contrat, workflow ou contrôle RGAA
n'est modifié.

Suivi : MAIR-437. Cette tranche ne termine pas l'audit des tests et ne certifie
pas l'authentification, les droits ou la persistance réels en dev.
