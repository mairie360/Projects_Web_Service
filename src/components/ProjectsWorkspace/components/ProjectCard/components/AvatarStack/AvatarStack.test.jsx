import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { memberOptions, person, priorityOptions, project, statusOptions, task } from '@tests/component/units/project-fixtures';
import { AvatarStack } from './AvatarStack';

describe('AvatarStack', () => {
  it('shows three people and counts the others', () => {
    render(<AvatarStack project={project({ assignees: ['A B', 'C D', 'E F', 'G H', 'I J'].map(person) })} />);
    expect(screen.getByText('+2')).toBeTruthy();
  });
});
