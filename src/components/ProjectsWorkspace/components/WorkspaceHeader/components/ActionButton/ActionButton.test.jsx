import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Plus } from 'lucide-react';
import { ActionButton } from './ActionButton';

describe('ActionButton', () => {
  it('labels the button and reports the click', async () => {
    const onClick = vi.fn();
    render(<ActionButton label="Nouveau projet" icon={Plus} primary onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau projet' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
