import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectLabels } from './ProjectLabels';

describe('ProjectLabels', () => {
  it('shows two labels at most and nothing without labels', () => {
    const { container, rerender } = render(<ProjectLabels labels={['Voirie', 'Énergie', 'Culture']} />);
    expect(screen.getByText('Voirie')).toBeTruthy(); expect(screen.queryByText('Culture')).toBeNull();
    rerender(<ProjectLabels labels={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
