import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { commentError, ProjectCommentForm } from './ProjectCommentForm';

describe('ProjectCommentForm (MAIR-874, MAIR-1089)', () => {
  it('checks the text the contract accepts', () => {
    expect(commentError('   ')).toBe('Écrivez un commentaire avant de le publier.');
    expect(commentError('a<b')).toBe('Le commentaire ne doit pas contenir les caractères < ou >.');
    expect(commentError('x'.repeat(2001))).toBe('Le commentaire ne doit pas dépasser 2000 caractères.');
    expect(commentError(' Devis reçu ')).toBe('');
  });

  it('publishes the trimmed text with « Publier » or Ctrl + Entrée, and empties the field', async () => {
    const onPublish = vi.fn(async () => true);
    render(<ProjectCommentForm onPublish={onPublish} pending={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Publier' }));
    expect(screen.getByText('Écrivez un commentaire avant de le publier.')).toBeTruthy();
    expect(onPublish).not.toHaveBeenCalled();
    const field = screen.getByLabelText(/^Commentaire/);
    await userEvent.type(field, '  Réunion fixée  ');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onPublish).toHaveBeenCalledWith('Réunion fixée');
    expect(field.value).toBe('');
  });

  it('keeps the text when the service refuses it', async () => {
    render(<ProjectCommentForm onPublish={vi.fn(async () => false)} pending={false} error="Le service des projets est indisponible." />);
    await userEvent.type(screen.getByLabelText(/^Commentaire/), 'Devis');
    await userEvent.click(screen.getByRole('button', { name: 'Publier' }));
    expect(screen.getByLabelText(/^Commentaire/).value).toBe('Devis');
    expect(screen.getByText('Le service des projets est indisponible.')).toBeTruthy();
  });
});
