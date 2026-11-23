import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectActivityTab } from './ProjectActivityTab';

const item = (index) => ({ kind: 'comment', id: `comment-${index}`, taskId: null, taskTitle: null, author: { id: 'user-2', name: 'Alice Martin' }, message: `Message ${index}`, changes: null, label: 'Comment', createdAt: '2026-09-04T09:00:00.000Z' });
const props = (overrides = {}) => ({ items: [item(1)], page: 1, pageSize: 20, total: 1, loading: false, onRetry: vi.fn(), onPageChange: vi.fn(), onPublish: vi.fn(async () => true), ...overrides });

describe('ProjectActivityTab (MAIR-874)', () => {
  it('lists the history and pages it', async () => {
    const value = props({ total: 45 });
    render(<ProjectActivityTab {...value} />);
    expect(screen.getByText('Alice Martin a commenté le projet')).toBeTruthy();
    expect(screen.getByText('Message 1')).toBeTruthy();
    expect(screen.getByText('45 entrées')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(value.onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows the empty, loading and unavailable states, and no composer without the right to comment', () => {
    const { rerender } = render(<ProjectActivityTab {...props({ items: [], total: 0 })} />);
    expect(screen.getByText('Aucune activité')).toBeTruthy();
    rerender(<ProjectActivityTab {...props({ items: [], total: 0, loading: true })} />);
    expect(screen.getByText('Chargement de l’activité')).toBeTruthy();
    rerender(<ProjectActivityTab {...props({ items: [], error: 'Service indisponible.', onPublish: undefined })} />);
    expect(screen.getByText('Activité indisponible')).toBeTruthy();
    expect(screen.queryByRole('form', { name: 'Publier un commentaire' })).toBeNull();
  });
});
