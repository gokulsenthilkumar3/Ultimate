import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import FreckleControls from './FreckleControls';
import HairDetailControls from './HairDetailControls';
import EyeAppearanceControls from './EyeAppearanceControls';

afterEach(cleanup);
it('edits iris presets, fixed pupils and boolean rim values in the selected context', () => {
  const onChange = vi.fn(); render(<EyeAppearanceControls metrics={{ eyePupilSizeMm: 4.2, irisLimbalRing: false }} onChange={onChange} />);
  expect(screen.getByRole('slider', { name: 'Pupil diameter' })).toHaveValue('4.2');
  expect(screen.getByRole('checkbox', { name: 'Dark iris rim' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Iris shade: Blue' }));
  expect(onChange).toHaveBeenLastCalledWith('eyeColor', '#4e7897');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Dark iris rim' }));
  expect(onChange).toHaveBeenLastCalledWith('irisLimbalRing', true);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Iris pattern seed' }), { target: { value: '999999' } });
  expect(onChange).toHaveBeenLastCalledWith('eyeSeed', 65535);
});

it('retains the saved fixed size while exposure response is selected', () => {
  const onChange = vi.fn(); render(<EyeAppearanceControls metrics={{ eyePupilMode: 'exposure', eyePupilSizeMm: 5.1 }} onChange={onChange} />);
  expect(screen.getByRole('slider', { name: 'Pupil diameter' })).toBeDisabled();
  expect(screen.getByRole('slider', { name: 'Pupil diameter' })).toHaveValue('5.1');
  fireEvent.change(screen.getByRole('combobox', { name: 'Pupil behaviour' }), { target: { value: 'fixed' } });
  expect(onChange).toHaveBeenLastCalledWith('eyePupilMode', 'fixed');
});
it('edits numeric hair values and named shades through the provided context callback', () => {
  const onChange = vi.fn(); render(<HairDetailControls metrics={{ hairGrey: .6, hairSeed: 74 }} onChange={onChange} />);
  expect(screen.getByRole('slider', { name: 'Grey hair' })).toHaveValue('0.6');
  fireEvent.change(screen.getByRole('slider', { name: 'Hair density' }), { target: { value: '.4' } });
  expect(onChange).toHaveBeenLastCalledWith('hairDensity', .4);
  fireEvent.click(screen.getByRole('button', { name: 'Hair shade: Silver' }));
  expect(onChange).toHaveBeenLastCalledWith('hairColor', '#c9c5be');
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Hair pattern seed' }), { target: { value: '765' } });
  expect(onChange).toHaveBeenLastCalledWith('hairSeed', 765);
});

it('edits freckles independently and hides them without changing their seed or size', () => {
  const onChange = vi.fn(); render(<FreckleControls metrics={{ skinFreckleDensity: .7, skinFreckleSizeMm: 1, skinFreckleSeed: 765 }} onChange={onChange} />);
  expect(screen.getByRole('slider', { name: 'Freckle radius' })).toHaveValue('1');
  fireEvent.change(screen.getByRole('slider', { name: 'Freckle contrast' }), { target: { value: '.8' } });
  expect(onChange).toHaveBeenLastCalledWith('skinFreckleContrast', .8);
  fireEvent.click(screen.getByRole('button', { name: 'Hide freckles' }));
  expect(onChange).toHaveBeenLastCalledWith('skinFreckleDensity', 0);
  expect(onChange).toHaveBeenCalledTimes(2);
});
