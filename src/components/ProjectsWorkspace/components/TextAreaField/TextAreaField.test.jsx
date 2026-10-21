import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextAreaField } from './TextAreaField';

describe('TextAreaField', () => {
  it('reports the typed description', () => {
    const onChange = vi.fn();
    render(<TextAreaField id="project-description" label="Description" value="" onChange={onChange} />);
    fireEvent.change(document.getElementById('project-description'), { target: { value: 'Jeux' } });
    expect(onChange).toHaveBeenCalledWith('Jeux');
  });
});
