import { afterEach, describe, expect, it, vi } from 'vitest';
import { communeName } from './commune';

afterEach(() => { vi.unstubAllEnvs(); });

describe('MAIR-1226 communeName', () => {
  it('names the commune of the deployment without « Mairie de », and hides a missing or oversized one', () => {
    expect(communeName('Mairie de Saint-André')).toBe('Saint-André');
    expect(communeName("Commune d'Arles")).toBe('Arles');
    expect(communeName('  Lyon  ')).toBe('Lyon');
    expect(communeName('   ')).toBeUndefined();
    expect(communeName('x'.repeat(81))).toBeUndefined();
  });

  it('reads COMMUNE_NAME when no value is given, and hides the block without it', () => {
    vi.stubEnv('COMMUNE_NAME', 'Mairie de Saint-André');
    expect(communeName()).toBe('Saint-André');
    vi.stubEnv('COMMUNE_NAME', '');
    expect(communeName()).toBeUndefined();
  });
});
