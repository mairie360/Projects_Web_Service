import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectLabels } from './ProjectLabels';

describe('ProjectLabels', () => {
  it('shows two labels at most and nothing without labels', () => {
    const { container, rerender } = render(<ProjectLabels labels={['Voirie', 'Énergie', 'Culture']} />);
    expect(screen.getByText('Voirie')).toBeTruthy(); expect(screen.queryByText('Culture')).toBeNull();
    rerender(<ProjectLabels labels={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
