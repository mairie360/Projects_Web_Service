import { within } from '@testing-library/react';

/** The options of a lib MultiSelect (MAIR-828): an always visible group of checkboxes named « Options : <label> ». */
export function multiSelectOptions(scope, label) {
  return within(scope.getAllByRole('group', { name: `Options : ${label}` })[0]);
}

/** Ticks (or unticks) one option of a lib MultiSelect, the way a user clicks its checkbox. */
export async function toggleOption(user, scope, label, name) {
  await user.click(multiSelectOptions(scope, label).getByRole('checkbox', { name }));
}

/** Names of the ticked options of a lib MultiSelect. */
export function checkedOptions(scope, label) {
  return multiSelectOptions(scope, label).queryAllByRole('checkbox', { checked: true }).map((box) => box.labels?.[0]?.textContent ?? box.getAttribute('aria-label'));
}
