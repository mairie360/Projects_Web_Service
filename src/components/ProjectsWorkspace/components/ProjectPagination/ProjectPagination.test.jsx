import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectPagination } from './ProjectPagination';

describe('ProjectPagination', () => {
  it('states the page and moves to the next one', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ProjectPagination pagination={{ page: 2, total: 30, hasNextPage: true }} pending={false} stale={false} onChange={onChange} />);
    expect(screen.getByRole('status').textContent).toBe('Page 2 · 30 projets');
    await userEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(onChange).toHaveBeenCalledWith('next');
    rerender(<ProjectPagination pagination={{ page: 2, total: 30, hasNextPage: true }} pending stale={false} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Page précédente' }).disabled).toBe(true);
    expect(screen.getByText('Chargement de la page demandée…')).toBeTruthy();
  });
});
