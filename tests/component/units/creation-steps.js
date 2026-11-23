import { within } from '@testing-library/react';

/** MAIR-1136: a project form every creation step accepts, and the group it names. */
export const creationGroups = [{ value: 'group-1', label: 'Voirie' }];
export const completeCreation = { title: 'Projet complet', groupId: 'group-1', dueDate: '2027-06-30', responsible: '2' };

/** Clicks the dash of a creation step (1 to 4), as an agent going back or forward. */
export async function goToCreationStep(user, dialog, step) {
  const [button] = within(dialog).getAllByRole('button', { name: new RegExp(`^Étape ${step} sur 4 :`) });
  await user.click(button);
}
