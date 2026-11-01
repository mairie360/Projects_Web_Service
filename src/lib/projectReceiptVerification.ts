export const PROJECT_VERIFICATION_MESSAGE = 'L’opération a été acceptée, mais sa confirmation de projet est incohérente. Vérifiez le projet sans répéter l’action.';

export const NEW_PROJECT_VERIFICATION_MESSAGE = 'L’opération a été acceptée, mais l’identité du nouveau projet n’est pas vérifiable. Consultez le catalogue sans répéter l’action. Sa lecture seule ne confirme pas cette création.';
export const NEW_PROJECT_TASK_VERIFICATION_MESSAGE = 'Le nouveau projet est identifié, mais les tâches de son reçu sont incohérentes. Vérifiez sa fiche sans répéter l’action.';

export class NewProjectReceiptVerificationRequiredError extends Error {
  constructor(message = NEW_PROJECT_VERIFICATION_MESSAGE) {
    super(message);
    this.name = 'NewProjectReceiptVerificationRequiredError';
  }
}

export class ProjectReceiptVerificationRequiredError extends Error {
  constructor() {
    super(PROJECT_VERIFICATION_MESSAGE);
    this.name = 'ProjectReceiptVerificationRequiredError';
  }
}
