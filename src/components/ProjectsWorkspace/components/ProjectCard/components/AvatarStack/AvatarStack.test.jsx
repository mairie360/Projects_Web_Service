import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { person, project } from '@tests/component/units/project-fixtures';
import { AvatarStack } from './AvatarStack';

describe('AvatarStack', () => {
  it('shows three people and counts the others', () => {
    render(<AvatarStack project={project({ assignees: ['A B', 'C D', 'E F', 'G H', 'I J'].map(person) })} />);
    expect(screen.getByText('+2')).toBeTruthy();
  });
});
