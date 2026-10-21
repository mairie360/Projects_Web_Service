import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WORKFLOW_UNAVAILABLE } from '@/lib/projectWorkflow';
import { ProjectWorkflow } from './ProjectWorkflow';

describe('ProjectWorkflow', () => {
  it('says the workflow is unavailable without a port', () => {
    render(<ProjectWorkflow projectId="p1" />);
    expect(screen.getByText(WORKFLOW_UNAVAILABLE)).toBeTruthy();
  });
});
