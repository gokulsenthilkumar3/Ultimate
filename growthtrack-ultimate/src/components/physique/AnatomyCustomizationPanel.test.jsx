import { fireEvent,render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AnatomyCustomizationPanel from './AnatomyCustomizationPanel';
import { createAnatomyCustomization } from '../../lib/anatomyCustomization';

vi.mock('./MeasurementHelp', () => ({ default: () => null }));

describe('private anatomy editing', () => {
  it('warns outside suggested limits and saves the entered value without a hard maximum', () => {
    const value=createAnatomyCustomization({current:{penis:{resting:{measurements:{lengthCm:22}}}}});
    const save=vi.fn();render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    expect(screen.getByText(/Outside suggested preview range 3–16/)).toBeInTheDocument();
    const input=screen.getByLabelText('Resting length current (cm)');
    expect(input).not.toHaveAttribute('max');
    fireEvent.focus(input);fireEvent.change(input,{target:{value:'25'}});fireEvent.blur(input);
    expect(save.mock.calls.at(-1)[0].current.penis.resting.measurements.lengthCm).toBe(25);
    fireEvent.focus(input);fireEvent.change(input,{target:{value:'-2'}});fireEvent.blur(input);
    expect(save).toHaveBeenCalledTimes(1);expect(input).toHaveAttribute('aria-invalid','true');
  });
  it('selects dimensions mode when width is edited and retains circumference records',()=> {
    const value=createAnatomyCustomization({current:{penis:{resting:{measurements:{midCircumferenceCm:10}}}}});
    const save=vi.fn();render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    const input=screen.getByLabelText('Width current (cm)');
    fireEvent.focus(input);fireEvent.change(input,{target:{value:'4'}});fireEvent.blur(input);
    expect(save.mock.calls.at(-1)[0].current.penis.resting).toMatchObject({inputMode:'dimensions',measurements:{widthCm:4,midCircumferenceCm:10}});
  });
});
