import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('reports the typed value', () => {
    const onChange = vi.fn();
    render(<FormField id="project-title" label="Titre" value="" required onChange={onChange} />);
    fireEvent.change(document.getElementById('project-title'), { target: { value: 'Parc' } });
    expect(onChange).toHaveBeenCalledWith('Parc');
    expect(document.getElementById('project-title').required).toBe(true);
  });
});
