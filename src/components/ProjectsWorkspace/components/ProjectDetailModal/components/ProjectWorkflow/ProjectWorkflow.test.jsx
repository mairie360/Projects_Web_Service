import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WORKFLOW_UNAVAILABLE } from '@/lib/projectWorkflow';
import { ProjectWorkflow } from './ProjectWorkflow';

describe('ProjectWorkflow', () => {
  it('says the workflow is unavailable without a port', () => {
    render(<ProjectWorkflow projectId="p1" />);
    expect(screen.getByText(WORKFLOW_UNAVAILABLE)).toBeTruthy();
  });
});
