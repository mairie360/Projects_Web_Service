export const PROJECT_VERIFICATION_MESSAGE = 'L’opération a été acceptée, mais sa confirmation de projet est incohérente. Vérifiez le projet sans répéter l’action.';

export class ProjectReceiptVerificationRequiredError extends Error {
  constructor() {
    super(PROJECT_VERIFICATION_MESSAGE);
    this.name = 'ProjectReceiptVerificationRequiredError';
  }
}
