# Typographie calculée du document

Le contrôle applique le véritable CSS du front à un document JSDOM isolé et vérifie la base calculée de17px et la police système du corps. Les déclarations parsées conservent les politiques du token Tailwind, des petits textes globaux et des dimensions fixes du header, sans dépendre du formatage ou des commentaires. PostCSS provient de la dépendance Next existante ; aucune dépendance ni source de production ne change. Les documents sont fermés, sans téléchargement externe.

JSDOM ne compile pas Tailwind, n'applique pas les media queries responsive et ne mesure ni géométrie, couches de cascade ou hit-test. Les contrôles natifs des véritables snapshots main restent distincts. Projects conserve ses gardes sidebar/ombre/empilement mobile en attendant un remplacement démontré. Cette tranche ne termine ni l'audit MAIR-437, ni la CI d'audit complète, ni la validation authentifiée en dev.
