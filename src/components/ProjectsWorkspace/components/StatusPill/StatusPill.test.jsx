import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('labels the value in French', () => {
    render(<StatusPill status="in-progress" />);
    expect(screen.getByText('En cours')).toBeTruthy();
  });
});
