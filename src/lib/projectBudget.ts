// MAIR-1085: the budgets of a project are integer cents of euro in the contract (`1250000` is 12 500,00 €), `null`
// when not filled in. The page shows them in euros and the edit takes euros typed the French way (« 12 500,50 »).

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** « 12 500 € », or « 12 500,50 € » with cents (never « 12 500,5 € »). */
export function formatBudget(cents: number) {
  const euros = cents / 100;
  return Number.isInteger(euros) ? EUROS.format(euros) : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(euros);
}

/** Value of the euros field for an amount in cents: empty without one, « 12500,5 » becomes « 12500,50 ». */
export function budgetInputValue(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return '';
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');
}

const AMOUNT = /^\d{1,13}(?:[.,]\d{1,2})?$/;

/**
 * Cents of a typed amount: `null` for an empty field (no budget), `undefined` for something that is not an amount
 * in euros with at most two decimals (a negative amount included: the BFF refuses it with a 400).
 */
export function parseBudgetInput(value: string): number | null | undefined {
  const compact = value.replace(/[\s  €]/g, '');
  if (!compact) return null;
  if (!AMOUNT.test(compact)) return undefined;
  const [units, decimals = ''] = compact.split(/[.,]/);
  return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

/** MAIR-846 (C4) « Budget engagé »: the committed amount on the voted one. */
export function budgetMetric({ budgetVoted, budgetCommitted }: { budgetVoted?: number | null; budgetCommitted?: number | null }) {
  const voted = budgetVoted ?? null;
  const committed = budgetCommitted ?? null;
  if (voted === null && committed === null) return { value: '—', detail: 'Budget non renseigné' };
  if (voted === null) return { value: formatBudget(committed ?? 0), detail: 'Budget voté non renseigné' };
  if (committed === null) return { value: '—', detail: `Sur ${formatBudget(voted)} votés` };
  const share = voted > 0 ? Math.round((committed / voted) * 100) : null;
  const over = committed > voted;
  return {
    value: formatBudget(committed),
    detail: `${over ? 'Dépasse les' : 'Sur'} ${formatBudget(voted)} votés${share === null ? '' : ` (${share} %)`}`,
    over,
  };
}
