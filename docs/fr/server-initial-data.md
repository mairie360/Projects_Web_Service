# Données initiales serveur

Le module Projects affiche les données initiales confirmées via les lectures GET du SDK publié épinglé, un adaptateur Axios propre à la requête et le proxy existant. Les lectures utilisent `no-store` et l’origine publique configurée et validée. Le serveur lit uniquement le cookie d’accès ; le renouvellement reste dans la reprise navigateur existante. Aucun jeton, cookie ni champ de réponse inconnu n’est sérialisé.

Les filtres et la pagination validés de l’URL définissent la lecture GET /projects-page. Les données confirmées et les brouillons projet/tâche restent présents pendant la vérification en arrière-plan.

Un contexte d’accès absent/expiré, un refus, une panne ou une réponse invalide produit un reçu d’indisponibilité explicite. L’hydratation reprend via la route navigateur existante. Le rendu serveur ne renouvelle pas de cookie et ne transforme pas un échec en liste vide confirmée. Chaque navigation serveur fournit une nouvelle clé opaque de cycle client.

Le `loading.tsx` local garde un statut annoncé et des surfaces statiques sans animation ni dépendance UI non publiée. Les nouvelles entrées serveur gardent le seuil de 60 % de lignes par fichier ; le choix de l’environnement ne crée aucune exemption. Les mesures de performance et leur recette sont consignées séparément.
