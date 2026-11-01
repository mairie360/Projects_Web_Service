import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriorityLabel } from './PriorityLabel';

describe('PriorityLabel', () => {
  it('labels the value in French', () => {
    render(<PriorityLabel priority="low" />);
    expect(screen.getByText('Basse')).toBeTruthy();
  });
});
