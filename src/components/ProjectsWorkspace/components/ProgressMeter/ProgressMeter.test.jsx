import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressMeter } from './ProgressMeter';

describe('ProgressMeter', () => {
  it('shows the percentage and fills the bar', () => {
    const { container, rerender } = render(<ProgressMeter value={40} />);
    expect(screen.getByText('40%')).toBeTruthy();
    expect(container.querySelector('[style]').style.width).toBe('40%');
    rerender(<ProgressMeter value={40} showLabel={false} />);
    expect(screen.queryByText('Progression')).toBeNull();
  });
});
