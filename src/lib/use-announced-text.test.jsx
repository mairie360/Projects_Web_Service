import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { useAnnouncedText } from './use-announced-text';

describe('MAIR-1226 useAnnouncedText (RGAA 7.5)', () => {
  it('mounts the region empty, then writes the text into it, and follows later changes', () => {
    const seen = [];
    const Spy = ({ text }) => { const value = useAnnouncedText(text); seen.push(value); return <p role="status">{value}</p>; };
    const { rerender, getByRole } = render(<Spy text="Chargement…" />);
    expect(seen[0]).toBe('');
    expect(getByRole('status').textContent).toBe('Chargement…');
    rerender(<Spy text="" />);
    expect(getByRole('status').textContent).toBe('');
  });
});
