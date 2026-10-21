import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskFollowUp } from './TaskFollowUp';

describe('TaskFollowUp', () => {
  it('lists comments and history, comments and refreshes after an error', async () => {
    const props = { taskTitle: 'Relevé', loading: false, saving: false, error: '', canComment: true, message: 'Vu', onMessageChange: vi.fn(), onRefresh: vi.fn(), onSubmit: vi.fn(event => event.preventDefault()) };
    const collaboration = { comments: [{ id: 'c1', author: { name: 'Alice' }, message: 'Posé', createdAt: '2026-10-02T10:00:00Z' }], history: [{ id: 'h1', label: 'Statut modifié', author: { name: 'Marie' }, createdAt: '2026-10-02T09:00:00Z' }] };
    const { rerender } = render(<TaskFollowUp {...props} collaboration={collaboration} />);
    expect(screen.getByText('Posé')).toBeTruthy();
    expect(screen.getByText('Statut modifié')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Commentaire pour Relevé' }), { target: { value: 'Vu et validé' } });
    expect(props.onMessageChange).toHaveBeenCalledWith('Vu et validé');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    rerender(<TaskFollowUp {...props} collaboration={{ comments: [], history: [] }} canComment={false} error="Suivi indisponible" />);
    expect(screen.getByText('Aucun commentaire.')).toBeTruthy();
    expect(screen.getByText('Aucune modification enregistrée.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Actualiser le suivi' }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });
});
