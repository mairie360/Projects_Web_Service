import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriorityPill } from './PriorityPill';

describe('PriorityPill', () => {
  it('labels the value in French', () => {
    render(<PriorityPill priority="high" />);
    expect(screen.getByText('Haute')).toBeTruthy();
  });
});
