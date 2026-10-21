import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TemplateManagerEditor } from './TemplateManagerEditor';

describe('TemplateManagerEditor', () => {
  it('reads the templates and says when saving is unavailable', async () => {
    render(<TemplateManagerEditor port={{ readTemplates: async () => [] }} />);
    expect(await screen.findByLabelText('Modèle à modifier')).toBeTruthy();
    expect(screen.getByText('L’enregistrement des modèles est indisponible.')).toBeTruthy();
  });
});
