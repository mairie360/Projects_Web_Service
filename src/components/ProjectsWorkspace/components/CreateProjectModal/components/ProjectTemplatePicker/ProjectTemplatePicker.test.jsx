import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WORKFLOW_UNAVAILABLE } from '@/lib/projectWorkflow';
import { ProjectTemplatePicker } from './ProjectTemplatePicker';

describe('ProjectTemplatePicker', () => {
  it('offers the loaded templates and reports the chosen one', async () => {
    const template = { id: 'model1', name: 'Modèle voirie', revision: 'r1', statuses: [{ id: 's1', name: 'Validation municipale', color: '#1256a6', category: 'todo' }] };
    let selected;
    render(<ProjectTemplatePicker port={{ readTemplates: async () => [template] }} onChange={value => { selected = value; }} />);
    fireEvent.change(await screen.findByLabelText('Modèle de projet'), { target: { value: 'model1' } });
    expect(screen.getByRole('list', { name: 'Statuts du modèle' }).textContent).toContain('Validation municipale');
    expect(selected).toEqual(template);
  });
  it('is disabled without a workflow port', () => {
    render(<ProjectTemplatePicker onChange={vi.fn()} />);
    expect(screen.getByLabelText('Modèle de projet').disabled).toBe(true);
    expect(screen.getByText(WORKFLOW_UNAVAILABLE)).toBeTruthy();
  });
});
