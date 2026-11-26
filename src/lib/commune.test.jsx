import { describe, expect, it } from 'vitest';
import { communeName } from './commune';

describe('MAIR-1226 communeName', () => {
  it('names the commune of the deployment without « Mairie de », and hides a missing or oversized one', () => {
    expect(communeName('Mairie de Saint-André')).toBe('Saint-André');
    expect(communeName("Commune d'Arles")).toBe('Arles');
    expect(communeName('  Lyon  ')).toBe('Lyon');
    expect(communeName(undefined)).toBeUndefined();
    expect(communeName('   ')).toBeUndefined();
    expect(communeName('x'.repeat(81))).toBeUndefined();
  });
});
