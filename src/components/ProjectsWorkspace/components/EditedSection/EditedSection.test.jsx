import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditedSection } from './EditedSection';

describe('EditedSection', () => {
  it('MAIR-1136: names the section and marks it « Modifié » only when a field changed', () => {
    const { rerender } = render(<EditedSection title="L’essentiel" modified={false}><input aria-label="Titre" /></EditedSection>);
    expect(screen.getByRole('region', { name: 'L’essentiel' })).toBeTruthy();
    expect(screen.queryByText('Modifié')).toBeNull();
    rerender(<EditedSection title="L’essentiel" modified><input aria-label="Titre" /></EditedSection>);
    expect(screen.getByText('Modifié')).toBeTruthy();
  });
});
