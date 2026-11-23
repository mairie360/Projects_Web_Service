import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectPagination } from './ProjectPagination';

describe('ProjectPagination', () => {
  it('states the shown range with the lib Pagination and moves to the next page (MAIR-828)', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ProjectPagination pagination={{ page: 2, limit: 10, total: 30, hasNextPage: true }} pending={false} stale={false} onChange={onChange} />);
    expect(screen.getByRole('navigation', { name: 'Pagination des projets' }).textContent).toContain('11 – 20 sur 30 projets');
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(onChange).toHaveBeenCalledWith('next');
    await userEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(onChange).toHaveBeenLastCalledWith('previous');
    rerender(<ProjectPagination pagination={{ page: 2, limit: 10, total: 30, hasNextPage: true }} pending stale={false} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Précédent' }).disabled).toBe(true);
    expect(screen.getByText('Chargement de la page demandée…')).toBeTruthy();
  });

  it('keeps the next page reachable when the BFF says one exists, and blocks a stale page', () => {
    const { rerender } = render(<ProjectPagination pagination={{ page: 3, limit: 10, total: 30, hasNextPage: true }} pending={false} stale={false} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Suivant' }).disabled).toBe(false);
    rerender(<ProjectPagination pagination={{ page: 3, limit: 10, total: 30, hasNextPage: true }} pending={false} stale onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Suivant' }).disabled).toBe(true);
    expect(screen.getByText('Dernière page confirmée — actualisation nécessaire.')).toBeTruthy();
  });
});
