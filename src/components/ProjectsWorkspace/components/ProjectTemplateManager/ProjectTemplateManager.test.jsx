import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectTemplateManager } from './ProjectTemplateManager';

describe('ProjectTemplateManager', () => {
  it('is reserved to responsibles and administrators, and needs a port', () => {
    const { rerender } = render(<ProjectTemplateManager role="User" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<ProjectTemplateManager role="Responsable" />);
    expect(screen.getByRole('button', { name: 'Gérer les modèles' }).disabled).toBe(true);
  });
});
