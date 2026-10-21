import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PersonAvatar } from './PersonAvatar';

describe('PersonAvatar', () => {
  it('shows the person initials', () => {
    const { container } = render(<PersonAvatar name="Alice Martin" />);
    expect(container.textContent).toContain('AM');
  });
});
